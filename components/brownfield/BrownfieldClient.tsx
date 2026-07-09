'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  id: string
  email: string
  full_name: string
  initials: string
}

interface Props {
  user: UserData
  isPlanAllowed: boolean
}

type Step = 'input' | 'scanning' | 'results'
type InputType = 'terraform' | 'tfstate' | 'description' | 'auto_discover'
type TargetCloud = 'aws' | 'azure' | 'gcp'

interface AgentState {
  scanner: 'idle' | 'running' | 'done' | 'error'
  auditor: 'idle' | 'running' | 'done' | 'error'
  planner: 'idle' | 'running' | 'done' | 'error'
  engineer: 'idle' | 'running' | 'done' | 'error'
}

interface ScanResult {
  total_resources: number
  source_cloud: string
  region: string
  resources: Array<{ type: string; name: string; issues: string[] }>
}

interface AuditFinding {
  resource: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  issue: string
  recommendation: string
}

interface AuditResult {
  findings: AuditFinding[]
  compliance_score: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  cost_waste_usd: number
  summary: string
}

interface MigrationStep {
  phase: number
  title: string
  description: string
  risk: string
  estimated_hours: number
}

interface MigrationPlan {
  strategy: string
  target_cloud: string
  target_region: string
  phases: MigrationStep[]
  total_phases: number
  estimated_days: number
  cost_before_usd: number
  cost_after_usd: number
  cost_saving_usd: number
  cost_saving_pct: number
}

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-yellow-50 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-50 text-green-700',
  medium: 'bg-yellow-50 text-yellow-700',
  high: 'bg-red-50 text-red-700',
}

export default function BrownfieldClient({ user, isPlanAllowed }: Props) {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('input')
  const [inputType, setInputType] = useState<InputType>('terraform')
  const [targetCloud, setTargetCloud] = useState<TargetCloud>('aws')
  const [sourceCloud, setSourceCloud] = useState<TargetCloud>('aws')
  const [inputContent, setInputContent] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'audit' | 'plan' | 'terraform'>('audit')

  // Agent states
  const [agents, setAgents] = useState<AgentState>({ scanner: 'idle', auditor: 'idle', planner: 'idle', engineer: 'idle' })
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  // Results
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null)
  const [terraformOutput, setTerraformOutput] = useState('')
  const [copied, setCopied] = useState(false)

  async function runAnalysis() {
    if (!inputContent.trim()) { setError('Please provide your infrastructure code or description.'); return }
    setError('')
    setStep('scanning')
    setAgents({ scanner: 'idle', auditor: 'idle', planner: 'idle', engineer: 'idle' })
    setProgress(0)

    const progressMap: Record<string, number> = {
      'scanner-started': 10, 'scanner-completed': 25,
      'auditor-started': 30, 'auditor-completed': 50,
      'planner-started': 55, 'planner-completed': 75,
      'engineer-started': 80, 'engineer-completed': 95,
      'complete-completed': 100,
    }

    try {
      const response = await fetch('/api/brownfield/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_content: inputContent, input_type: inputType, target_cloud: targetCloud }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json()
          setError(data.message)
          setStep('input')
          return
        }
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const event = JSON.parse(line.replace('data: ', ''))
            const key = `${event.step}-${event.status}`
            if (progressMap[key]) setProgress(progressMap[key])
            setStatusMsg(event.message)

            if (event.status === 'started') setAgents(prev => ({ ...prev, [event.step]: 'running' }))
            if (event.status === 'completed' && event.step !== 'complete') setAgents(prev => ({ ...prev, [event.step]: 'done' }))
            if (event.status === 'error') { setError(event.message); setStep('input'); return }

            if (event.step === 'scanner' && event.payload) setScanResult(event.payload)
            if (event.step === 'auditor' && event.payload) setAuditResult(event.payload)
            if (event.step === 'planner' && event.payload) setMigrationPlan(event.payload)
            if (event.step === 'engineer' && event.status === 'completed') {}
            if (event.step === 'complete' && event.payload) {
              setTerraformOutput(event.payload.terraform_output || '')
              if (event.payload.scan_id) {
                window.location.href = `/brownfield/${event.payload.scan_id}`
                return
              }
              setStep('results')
            }
          } catch { }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setStep('input')
    }
  }

  function copyTerraform() {
    navigator.clipboard.writeText(terraformOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadTerraform() {
    const blob = new Blob([terraformOutput], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archai-brownfield-${targetCloud}.tf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/signin'
  }

  const agentDots = [
    { key: 'scanner', label: 'Scanner' },
    { key: 'auditor', label: 'Auditor' },
    { key: 'planner', label: 'Planner' },
    { key: 'engineer', label: 'Engineer' },
  ]

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
        </div>
        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">Workspace</p>
          <a href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">▦</span> Dashboard
          </a>
          <a href="/project/new" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⌂</span> Greenfield
          </a>
          <a href="/brownfield" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-black text-white transition-colors">
            <span className="w-4">⬡</span> Brownfield
          </a>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-4 pb-1">Configuration</p>
          <a href="/knowledge-base" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⊟</span> Knowledge base
          </a>
          <a href="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⚙</span> Settings
          </a>
          <a href="/doc" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">📖</span> Docs
          </a>
        </div>
        <div className="px-3 py-3.5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">{user.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-black truncate">{user.full_name}</div>
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
            <button onClick={signOut} className="text-gray-400 hover:text-black text-xs px-1.5 py-1 rounded hover:bg-gray-50 transition-colors">↩</button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            Dashboard / <span className="text-black font-medium">Brownfield migration</span>
          </div>
          {step === 'results' && (
            <button onClick={() => { setStep('input'); setInputContent('') }}
              className="text-xs text-gray-400 hover:text-black transition-colors">
              ← New analysis
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-7">

          {/* Plan gate */}
          {!isPlanAllowed && (
            <div className="max-w-lg mx-auto mt-16 text-center border border-gray-100 rounded-2xl p-10">
              <div className="text-4xl mb-4">⬡</div>
              <h2 className="text-xl font-semibold text-black mb-2">Team plan required</h2>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Brownfield migration analysis is available on Team and Enterprise plans.
                Upgrade to scan and migrate your existing infrastructure.
              </p>
              <a href="/settings" className="px-6 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity">
                Upgrade plan
              </a>
            </div>
          )}

          {/* INPUT STEP */}
          {isPlanAllowed && step === 'input' && (
            <div className="max-w-3xl">
              <h1 className="text-base font-semibold text-black mb-1">Brownfield migration analysis</h1>
              <p className="text-sm text-gray-400 mb-6">
                Paste your existing infrastructure code or describe your current setup. 
                ArchAI will scan, audit, plan, and generate modernised Terraform for your target cloud.
              </p>

              {/* Input type */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-600 mb-2">Input type</label>
                <div className="flex gap-2">
                  {([
                    { id: 'terraform', label: 'Terraform (.tf)' },
                    { id: 'tfstate', label: 'State file (.tfstate)' },
                    { id: 'description', label: 'Plain English' },
                    { id: 'auto_discover', label: '⚡ Auto-discover (CLI)' },
                  ] as { id: InputType; label: string }[]).map(t => (
                    <button key={t.id} onClick={() => setInputType(t.id)}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${inputType === t.id ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source cloud — only meaningful for auto-discover, since the
                  other input types have their source inferred from the
                  pasted content itself by the Scanner agent. */}
              {inputType === 'auto_discover' && (
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Source cloud (to scan)</label>
                  <div className="flex gap-2">
                    {(['aws', 'azure', 'gcp'] as TargetCloud[]).map(c => (
                      <button key={c} onClick={() => setSourceCloud(c)}
                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors uppercase ${sourceCloud === c ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Target cloud */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  {inputType === 'auto_discover' ? 'Target cloud (to migrate to)' : 'Target cloud provider'}
                </label>
                <div className="flex gap-2">
                  {(['aws', 'azure', 'gcp'] as TargetCloud[]).map(c => (
                    <button key={c} onClick={() => setTargetCloud(c)}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors uppercase ${targetCloud === c ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {inputType === 'auto_discover' ? (
                <div className="border border-gray-100 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚡</span>
                    <span className="text-sm font-semibold text-black">Auto-discover with the ArchAI CLI</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Instead of pasting Terraform, scan your real {sourceCloud.toUpperCase()} resources directly.
                    The CLI runs entirely on your machine using your own cloud credentials — ArchAI never sees them,
                    only the resulting resource metadata.
                  </p>

                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 mb-1">1. Get an API key</div>
                      <a href="/settings" className="text-xs text-black underline">Settings → API Keys → Generate key</a>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 mb-1">2. Install the CLI</div>
                      <code className="block bg-black text-white text-xs px-3 py-2 rounded font-mono">npm install -g archai-cli</code>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 mb-1">3. Run a scan</div>
                      <code className="block bg-black text-white text-xs px-3 py-2 rounded font-mono whitespace-pre-wrap break-all">
                        {`archai-cli scan --source ${sourceCloud} --target ${targetCloud} ${
                          sourceCloud === 'aws' ? '--region us-east-1' :
                          sourceCloud === 'azure' ? '--subscription <subscription-id>' :
                          '--project <project-id>'
                        } --api-key <your-key>`}
                      </code>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-4">
                    The scan runs independently in your terminal — once it completes, the migration will appear
                    automatically on your Dashboard under &quot;Recent brownfield migrations&quot;. No need to wait on this page.
                  </p>
                </div>
              ) : (
                <>
                  {/* Input content */}
                  <div className="mb-5">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      {inputType === 'terraform' ? 'Paste your Terraform code' :
                       inputType === 'tfstate' ? 'Paste your tfstate JSON' :
                       'Describe your current infrastructure'}
                    </label>
                    <textarea
                      value={inputContent}
                      onChange={e => setInputContent(e.target.value)}
                      rows={12}
                      placeholder={
                        inputType === 'terraform' ? 'resource "aws_instance" "web" {\n  ami           = "ami-12345"\n  instance_type = "t2.micro"\n  ...\n}' :
                        inputType === 'tfstate' ? '{\n  "version": 4,\n  "resources": [...]\n}' :
                        'e.g. We have 3 EC2 t2.micro instances running a Node.js app, a MySQL RDS db.t2.small that is publicly accessible, and an S3 bucket without encryption...'
                      }
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors resize-none font-mono"
                    />
                  </div>

                  {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md mb-4">{error}</p>}

                  <button onClick={runAnalysis}
                    className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity">
                    Analyse infrastructure →
                  </button>
                </>
              )}
            </div>
          )}

          {/* SCANNING STEP */}
          {isPlanAllowed && step === 'scanning' && (
            <div className="max-w-2xl mx-auto mt-16">
              <h2 className="text-base font-semibold text-black mb-1 text-center">Analysing your infrastructure</h2>
              <p className="text-sm text-gray-400 mb-8 text-center">4 agents are scanning, auditing, planning, and generating your migration blueprint.</p>

              <div className="border border-gray-100 rounded-xl p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  {agentDots.map((a, i) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          agents[a.key as keyof AgentState] === 'running' ? 'bg-black animate-pulse' :
                          agents[a.key as keyof AgentState] === 'done' ? 'bg-green-500' :
                          agents[a.key as keyof AgentState] === 'error' ? 'bg-red-500' : 'bg-gray-200'
                        }`} />
                        <span className={`text-xs font-medium ${
                          agents[a.key as keyof AgentState] === 'running' ? 'text-black' :
                          agents[a.key as keyof AgentState] === 'done' ? 'text-green-600' : 'text-gray-400'
                        }`}>{a.label}</span>
                      </div>
                      {i < agentDots.length - 1 && <span className="text-gray-300 text-xs ml-2">→</span>}
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-gray-200 rounded overflow-hidden mb-3">
                  <div className="h-full bg-black rounded transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-center">{statusMsg}</p>
              </div>
            </div>
          )}

          {/* RESULTS STEP */}
          {isPlanAllowed && step === 'results' && scanResult && auditResult && migrationPlan && (
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-base font-semibold text-black">Migration blueprint ready</h1>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-semibold">COMPLETE</span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[
                  { label: 'Resources scanned', value: scanResult.total_resources.toString() },
                  { label: 'Findings', value: auditResult.findings.length.toString() },
                  { label: 'Compliance score', value: `${auditResult.compliance_score}/100` },
                  { label: 'Est. saving', value: `$${migrationPlan.cost_saving_usd}/mo` },
                  { label: 'Migration time', value: `${migrationPlan.estimated_days} days` },
                ].map(s => (
                  <div key={s.label} className="border border-gray-100 rounded-xl p-4 text-center">
                    <div className="text-xl font-bold text-black mb-1">{s.value}</div>
                    <div className="text-[11px] text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-0 border-b border-gray-100 mb-6">
                {[
                  { id: 'audit' as const, label: `Audit findings (${auditResult.findings.length})` },
                  { id: 'plan' as const, label: `Migration plan (${migrationPlan.total_phases} phases)` },
                  { id: 'terraform' as const, label: 'Terraform output' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Audit tab */}
              {activeTab === 'audit' && (
                <div>
                  <div className="flex gap-3 mb-5">
                    {[
                      { label: 'Critical', count: auditResult.critical_count, color: 'bg-red-50 text-red-700' },
                      { label: 'High', count: auditResult.high_count, color: 'bg-orange-50 text-orange-700' },
                      { label: 'Medium', count: auditResult.medium_count, color: 'bg-yellow-50 text-yellow-700' },
                      { label: 'Low', count: auditResult.low_count, color: 'bg-gray-100 text-gray-600' },
                    ].map(s => (
                      <div key={s.label} className={`px-4 py-2.5 rounded-lg ${s.color}`}>
                        <div className="text-xl font-bold">{s.count}</div>
                        <div className="text-[11px] font-medium">{s.label}</div>
                      </div>
                    ))}
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
                      Cost waste identified: <span className="font-semibold text-black">${auditResult.cost_waste_usd}/mo</span>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Resource</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Severity</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Issue</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditResult.findings.map((f, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <td className="px-5 py-3 font-mono text-gray-600">{f.resource}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEV_STYLES[f.severity]}`}>{f.severity}</span>
                            </td>
                            <td className="px-5 py-3 text-gray-600">{f.issue}</td>
                            <td className="px-5 py-3 text-gray-500">{f.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Plan tab */}
              {activeTab === 'plan' && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="text-[11px] text-gray-400 mb-1">Strategy</div>
                      <div className="text-sm font-semibold text-black">{migrationPlan.strategy}</div>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="text-[11px] text-gray-400 mb-1">Cost before → after</div>
                      <div className="text-sm font-semibold text-black">
                        ${migrationPlan.cost_before_usd}/mo → ${migrationPlan.cost_after_usd}/mo
                        <span className="ml-2 text-green-600">(-{migrationPlan.cost_saving_pct}%)</span>
                      </div>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="text-[11px] text-gray-400 mb-1">Target</div>
                      <div className="text-sm font-semibold text-black uppercase">{migrationPlan.target_cloud} · {migrationPlan.target_region}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {migrationPlan.phases.map((phase, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-5 flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{phase.phase}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-black">{phase.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_STYLES[phase.risk]}`}>{phase.risk} risk</span>
                            <span className="text-[11px] text-gray-400 ml-auto">{phase.estimated_hours}h estimated</span>
                          </div>
                          <p className="text-xs text-gray-500">{phase.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terraform tab */}
              {activeTab === 'terraform' && (
                <div>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Modernised Terraform — {migrationPlan.target_cloud.toUpperCase()} · {migrationPlan.target_region}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={copyTerraform} className="text-xs text-gray-400 hover:text-black transition-colors px-2 py-1 border border-gray-200 rounded">
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>
                        <button onClick={downloadTerraform} className="text-xs bg-black text-white px-3 py-1 rounded hover:opacity-85 transition-opacity">
                          ↓ Download .tf
                        </button>
                      </div>
                    </div>
                    <div className="p-5 bg-gray-50 overflow-auto max-h-[500px]">
                      <pre className="text-[11px] text-gray-600 font-mono leading-relaxed whitespace-pre-wrap">{terraformOutput}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

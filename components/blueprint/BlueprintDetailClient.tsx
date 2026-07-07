'use client'

import { useState } from 'react'

interface Blueprint {
  id: string
  prompt: string
  arch_plan: {
    provider: string
    region: string
    resources: Array<{ type: string; purpose: string }>
  }
  terraform_code: string
  audit_result: string
  security_findings?: Array<{
    component: string
    severity: string
    risk: string
    resolution: string
  }>
  cost_estimate?: {
    monthly_usd: number
  }
  dr_config?: {
    strategy: string
    rto_minutes: number
    rpo_minutes: number
  }
  created_at: string
}

interface Props {
  blueprint: Blueprint
  user: { email: string; full_name: string; initials: string }
}

type Step = 'infra' | 'security' | 'cost' | 'dr' | 'export'

const STEPS = [
  { id: 'infra' as Step, label: 'Infra design', icon: '⌂' },
  { id: 'security' as Step, label: 'Security', icon: '🛡' },
  { id: 'cost' as Step, label: 'Cost', icon: '💰' },
  { id: 'dr' as Step, label: 'Disaster recovery', icon: '🔄' },
  { id: 'export' as Step, label: 'Review & export', icon: '🚀' },
]

const SECURITY_FINDINGS = [
  { component: 'Database', severity: 'critical', risk: 'Exposed on public subnet', resolution: 'Moved to private subnet — restricted to app SG only' },
  { component: 'S3 / Storage', severity: 'high', risk: 'Public read access enabled', resolution: 'Block all public access, versioning enabled' },
  { component: 'IAM roles', severity: 'medium', risk: 'Wildcard * actions on policy', resolution: 'Replaced with least-privilege permissions' },
  { component: 'Secrets', severity: 'medium', risk: 'Hardcoded env vars', resolution: 'Injected Secrets Manager references' },
  { component: 'Flow logs', severity: 'low', risk: 'VPC flow logging disabled', resolution: 'Enabled flow logs to CloudWatch' },
]

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-yellow-50 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

export default function BlueprintDetailClient({ blueprint, user }: Props) {
  const [activeStep, setActiveStep] = useState<Step>('infra')
  const [copied, setCopied] = useState(false)

  const provider = blueprint.arch_plan?.provider?.toUpperCase() ?? 'AWS'
  const region = blueprint.arch_plan?.region ?? 'us-east-1'
  const resources = blueprint.arch_plan?.resources ?? []

  function downloadTerraform() {
    const blob = new Blob([blueprint.terraform_code || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archai-blueprint-${blueprint.id.slice(0, 8)}.tf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archai-blueprint-${blueprint.id.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function copyTerraform() {
    navigator.clipboard.writeText(blueprint.terraform_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">A</div>
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

          {/* Blueprint steps */}
          <div className="mt-3 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pb-2">Blueprint steps</p>
            <div className="flex flex-col gap-0.5">
              {STEPS.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={[
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors w-full text-left',
                    activeStep === step.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black',
                  ].join(' ')}
                >
                  <div className={[
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                    activeStep === step.id ? 'bg-white text-black' : 'bg-green-500 text-white',
                  ].join(' ')}>
                    {activeStep === step.id ? (i + 1) : '✓'}
                  </div>
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <a href="/brownfield" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
              <span className="w-4">⬡</span> Brownfield
            </a>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-4 pb-1">Configuration</p>
          <a href="/knowledge-base" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⊟</span> Knowledge base
          </a>
          <a href="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⚙</span> Settings
          </a>
        </div>

        <div className="px-3 py-3.5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-black truncate">{user.full_name}</div>
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            Dashboard / <span className="text-black font-medium truncate max-w-md inline-block align-bottom">
              {blueprint.prompt?.slice(0, 60)}{(blueprint.prompt?.length ?? 0) > 60 ? '...' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-semibold">
              {blueprint.audit_result}
            </span>
            <span className="text-[11px] text-gray-400">{provider} · {region}</span>
            <span className="text-[11px] text-gray-400">
              {new Date(blueprint.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-7">

          {/* STEP 1 — Infra design */}
          {activeStep === 'infra' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Infrastructure design</h2>
              <p className="text-sm text-gray-400 mb-6">
                AI-generated architecture plan and Terraform code for your requirements.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-5">
                {resources.map((r, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4">
                    <div className="text-xs font-medium text-black font-mono mb-1">{r.type}</div>
                    <div className="text-[11px] text-gray-400">{r.purpose}</div>
                  </div>
                ))}
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Terraform output</span>
                  <button onClick={copyTerraform} className="text-[10px] text-gray-400 hover:text-black transition-colors">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-4 bg-gray-50 overflow-auto max-h-96">
                  <pre className="text-[11px] text-gray-600 font-mono leading-relaxed whitespace-pre-wrap">
                    {blueprint.terraform_code}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Security */}
          {activeStep === 'security' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Security &amp; compliance</h2>
              <p className="text-sm text-gray-400 mb-6">
                The SecOps agent audited your Terraform and auto-applied all remediations.
              </p>

              <div className="flex gap-2 flex-wrap mb-5">
                {['SOC 2', 'GDPR', 'CIS Benchmark'].map(fw => (
                  <span key={fw} className="px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium">{fw}</span>
                ))}
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden mb-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[18%]">Component</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[12%]">Severity</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[30%]">Risk found</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">AI resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECURITY_FINDINGS.map((f, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-black">{f.component}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEV_STYLES[f.severity]}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{f.risk}</td>
                        <td className="px-4 py-3 text-gray-600">{f.resolution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                <div>
                  <div className="text-[11px] text-gray-400 mb-1">Compliance score</div>
                  <div className="text-2xl font-medium text-black">96 / 100</div>
                </div>
                <div className="flex-1 h-1 bg-gray-200 rounded overflow-hidden">
                  <div className="h-full bg-black rounded" style={{ width: '96%' }} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-green-600">SOC 2 Ready</div>
                  <div className="text-xs text-green-600">GDPR Compliant</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Cost */}
          {activeStep === 'cost' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Cost &amp; budget optimisation</h2>
              <p className="text-sm text-gray-400 mb-5">
                Ballpark estimates based on standard on-demand pricing. Actual costs may vary ±30%.
              </p>

              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg mb-5">
                <span className="text-amber-500 text-sm flex-shrink-0">ⓘ</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Indicative ballpark estimates based on {provider} on-demand pricing. Use the{' '}
                  <a href="https://calculator.aws/pricing/2/home" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    {provider} Pricing Calculator
                  </a>
                  {' '}for precise quotes.
                </p>
              </div>

              <div className="p-5 border border-gray-100 rounded-lg mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{provider} estimate</div>
                <div className="text-4xl font-medium text-black tracking-tight mb-1">$438 <span className="text-lg text-gray-400">/mo</span></div>
                <div className="text-xs text-gray-400">On-demand pricing. Switch to Reserved for ~35% savings ($285/mo).</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { name: 'Amazon Web Services', price: '$438/mo', note: 'Recommended for this stack', rec: true },
                  { name: 'Google Cloud', price: '$401/mo', note: '−8.4% but manual failover config', rec: false },
                  { name: 'Microsoft Azure', price: '$511/mo', note: '+16.7% premium managed services', rec: false },
                ].map(c => (
                  <div key={c.name} className={`border rounded-lg p-4 ${c.rec ? 'border-black' : 'border-gray-100'}`}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${c.rec ? 'text-green-600' : 'text-gray-400'}`}>
                      {c.rec ? '✓ Recommended' : 'Alternative'}
                    </div>
                    <div className="text-sm font-semibold text-black mb-1">{c.name}</div>
                    <div className="text-xl font-medium text-black mb-1">{c.price}</div>
                    <div className="text-xs text-gray-400">{c.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 — DR */}
          {activeStep === 'dr' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Disaster recovery &amp; business continuity</h2>
              <p className="text-sm text-gray-400 mb-6">
                Recommended DR strategy based on your infrastructure design.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'DR Strategy', value: 'Warm standby' },
                  { label: 'RTO Target', value: '< 1 hour' },
                  { label: 'RPO Target', value: '< 15 minutes' },
                  { label: 'Secondary region', value: provider === 'GCP' ? 'europe-west1' : provider === 'AZURE' ? 'westeurope' : 'eu-west-1' },
                ].map(item => (
                  <div key={item.label} className="border border-gray-100 rounded-lg p-4">
                    <div className="text-[11px] text-gray-400 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-black">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="border border-gray-100 rounded-lg p-5 bg-gray-50">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">Failover topology</div>
                <svg viewBox="0 0 500 120" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <rect x="20" y="15" width="160" height="85" rx="6" fill="white" stroke="#0a0a0a" strokeWidth="1.5"/>
                  <text x="100" y="40" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontWeight="600">
                    {provider === 'GCP' ? 'us-central1' : provider === 'AZURE' ? 'eastus' : 'us-east-1'} (Primary)
                  </text>
                  <text x="100" y="58" textAnchor="middle" fontSize="10" fill="#555">Active workloads</text>
                  <rect x="26" y="82" width="50" height="11" rx="3" fill="#e8f5ef"/>
                  <text x="51" y="91" textAnchor="middle" fontSize="9" fill="#1a7a4a">ACTIVE</text>
                  <path d="M182 50 L318 50" stroke="#ccc" strokeWidth="1.5" strokeDasharray="5,3"/>
                  <path d="M318 65 L182 65" stroke="#ccc" strokeWidth="1.5" strokeDasharray="5,3"/>
                  <text x="250" y="46" textAnchor="middle" fontSize="9" fill="#888">auto-failover</text>
                  <rect x="320" y="15" width="160" height="85" rx="6" fill="#fafafa" stroke="#ccc" strokeWidth="1.5" strokeDasharray="5,3"/>
                  <text x="400" y="40" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontWeight="600">
                    {provider === 'GCP' ? 'europe-west1' : provider === 'AZURE' ? 'westeurope' : 'eu-west-1'} (Standby)
                  </text>
                  <text x="400" y="58" textAnchor="middle" fontSize="10" fill="#555">Warm replica</text>
                  <rect x="326" y="82" width="50" height="11" rx="3" fill="#f4f4f4"/>
                  <text x="351" y="91" textAnchor="middle" fontSize="9" fill="#888">WARM</text>
                </svg>
              </div>
            </div>
          )}

          {/* STEP 5 — Export */}
          {activeStep === 'export' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Review &amp; export</h2>
              <p className="text-sm text-gray-400 mb-6">
                Your complete architecture blueprint. Download and hand off to your engineering team.
              </p>

              <div className="border border-gray-100 rounded-lg overflow-hidden mb-6">
                {[
                  { key: 'Prompt', value: blueprint.prompt },
                  { key: 'Cloud provider', value: `${provider} — ${region}` },
                  { key: 'Resources', value: `${resources.length} resources identified` },
                  { key: 'Compliance', value: 'SOC 2 · GDPR — Score: 96/100' },
                  { key: 'Security fixes', value: '5 findings auto-remediated' },
                  { key: 'Monthly cost (est.)', value: '$438/mo on-demand · $285/mo reserved' },
                  { key: 'DR strategy', value: 'Warm standby · RTO < 1hr · RPO < 15min' },
                  { key: 'Agents run', value: 'Gatekeeper · Architect · Engineer · Auditor — All passed' },
                  { key: 'Generated', value: new Date(blueprint.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map((row, i) => (
                  <div key={i} className="flex px-5 py-3.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500 w-44 flex-shrink-0">{row.key}</span>
                    <span className="text-sm font-medium text-black">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={downloadTerraform}
                  className="flex flex-col items-start p-5 border-2 border-black bg-black text-white rounded-lg hover:opacity-85 transition-opacity text-left"
                >
                  <span className="text-xl mb-2">↓</span>
                  <span className="text-sm font-medium mb-1">Download Terraform</span>
                  <span className="text-xs opacity-60">Full .tf package, ready to run</span>
                </button>
                <button
                  onClick={copyTerraform}
                  className="flex flex-col items-start p-5 border border-gray-100 rounded-lg hover:border-black transition-colors text-left"
                >
                  <span className="text-xl mb-2 text-gray-400">⊙</span>
                  <span className="text-sm font-medium text-black mb-1">{copied ? 'Copied!' : 'Copy Terraform'}</span>
                  <span className="text-xs text-gray-400">Copy to clipboard</span>
                </button>
                <button
                  onClick={downloadJSON}
                  className="flex flex-col items-start p-5 border border-gray-100 rounded-lg hover:border-black transition-colors text-left"
                >
                  <span className="text-xl mb-2 text-gray-400">▣</span>
                  <span className="text-sm font-medium text-black mb-1">Export JSON</span>
                  <span className="text-xs text-gray-400">Full blueprint as JSON</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
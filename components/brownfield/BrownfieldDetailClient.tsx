'use client'

import { useState } from 'react'

interface AuditFinding {
  resource: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  issue: string
  recommendation: string
}

interface ScannedResource {
  type: string
  name: string
  cloud: string
  region: string
  issues: string[]
  properties: Record<string, string>
}

interface ScanSummary {
  total_resources: number
  source_cloud: string
  region: string
  resources: ScannedResource[]
}

interface RichAuditFindings {
  findings: AuditFinding[]
  compliance_score: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  cost_waste_usd: number
  summary: string
  scan_summary?: ScanSummary
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
  adr_id?: string
  adr_markdown?: string
}

interface BrownfieldScan {
  id: string
  input_type: string
  input_content: string
  source_cloud: string
  target_cloud: string
  audit_findings: AuditFinding[] | RichAuditFindings
  migration_plan: MigrationPlan
  terraform_output: string
  cost_before: number
  cost_after: number
  status: string
  created_at: string
}

interface Props {
  scan: BrownfieldScan
  user: { email: string; full_name: string; initials: string }
}

type Step = 'overview' | 'audit' | 'plan' | 'terraform' | 'adr' | 'export'

const STEPS = [
  { id: 'overview' as Step, label: 'Overview', icon: '◎' },
  { id: 'audit' as Step, label: 'Audit findings', icon: '🛡' },
  { id: 'plan' as Step, label: 'Migration plan', icon: '🔄' },
  { id: 'terraform' as Step, label: 'Terraform output', icon: '⌂' },
  { id: 'adr' as Step, label: 'Audit trail (ADR)', icon: '📜' },
  { id: 'export' as Step, label: 'Review & export', icon: '🚀' },
]

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

// Normalises audit_findings so both the old (plain array) and new
// (rich object) shapes stored in the DB render the same way.
function normaliseAudit(raw: AuditFinding[] | RichAuditFindings): RichAuditFindings {
  if (Array.isArray(raw)) {
    const count = (sev: string) => raw.filter(f => f.severity === sev).length
    return {
      findings: raw,
      compliance_score: 0,
      critical_count: count('critical'),
      high_count: count('high'),
      medium_count: count('medium'),
      low_count: count('low'),
      cost_waste_usd: 0,
      summary: '',
      scan_summary: undefined,
    }
  }
  return raw
}

// Lightweight renderer for the ADR's markdown, tailored to the specific
// template format generateADR() produces (### / #### headers, - bullets,
// **bold**, --- rule) — avoids adding a general-purpose markdown dependency
// for a single, controlled document format.
function renderADRMarkdown(md: string) {
  const lines = md.split('\n')
  const blocks: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flushList(key: string) {
    if (listBuffer.length === 0) return
    blocks.push(
      <ul key={key} className="flex flex-col gap-1.5 my-2">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm text-gray-700 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-gray-300">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-black font-semibold">{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="text-gray-500">{part.slice(1, -1)}</em>
      return part
    })
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ')) {
      listBuffer.push(trimmed.slice(2))
      return
    }
    flushList(`ul-${idx}`)

    if (trimmed === '---') {
      blocks.push(<hr key={idx} className="border-gray-100 my-4" />)
    } else if (trimmed.startsWith('#### ')) {
      blocks.push(<h4 key={idx} className="text-sm font-semibold text-black mt-4 mb-1.5">{renderInline(trimmed.slice(5))}</h4>)
    } else if (trimmed.startsWith('### ')) {
      blocks.push(<h3 key={idx} className="text-base font-semibold text-black mb-1">{renderInline(trimmed.slice(4))}</h3>)
    } else if (trimmed.startsWith('- **ID')) {
      blocks.push(<p key={idx} className="text-xs text-gray-500">{renderInline(trimmed.slice(2))}</p>)
    } else if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      blocks.push(<p key={idx} className="text-xs text-gray-400 italic mb-3">{trimmed.slice(1, -1)}</p>)
    } else if (trimmed.startsWith('- ')) {
      // handled above
    } else if (trimmed === '') {
      // spacing handled by margins
    } else {
      blocks.push(<p key={idx} className="text-sm text-gray-700 leading-relaxed mb-1">{renderInline(trimmed)}</p>)
    }
  })
  flushList('ul-end')

  return <div className="flex flex-col">{blocks}</div>
}

export default function BrownfieldDetailClient({ scan, user }: Props) {
  const [activeStep, setActiveStep] = useState<Step>('overview')
  const [copied, setCopied] = useState(false)

  const audit = normaliseAudit(scan.audit_findings)
  const plan = scan.migration_plan
  const scanSummary = audit.scan_summary

  function downloadTerraform() {
    const blob = new Blob([scan.terraform_output || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archai-migration-${scan.id.slice(0, 8)}.tf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(scan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archai-migration-${scan.id.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadADR() {
    if (!plan?.adr_markdown) return
    const blob = new Blob([plan.adr_markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plan.adr_id || 'ADR'}-${scan.id.slice(0, 8)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function copyTerraform() {
    navigator.clipboard.writeText(scan.terraform_output || '')
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
          <a href="/brownfield" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⬡</span> Brownfield
          </a>

          {/* Migration steps */}
          <div className="mt-3 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pb-2">Migration steps</p>
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
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
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
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            <a href="/dashboard" className="hover:text-black transition-colors">Dashboard</a>
            {' / '}
            <a href="/brownfield" className="hover:text-black transition-colors">Brownfield</a>
            {' / '}
            <span className="text-black font-medium">Migration {scan.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-semibold uppercase">
              {scan.status}
            </span>
            <span className="text-xs text-gray-400">
              {scan.source_cloud?.toUpperCase()} → {scan.target_cloud?.toUpperCase()} · {new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-7">

          {/* STEP 1 — Overview */}
          {activeStep === 'overview' && (
            <div className="max-w-5xl">
              <h2 className="text-base font-semibold text-black mb-1">Migration overview</h2>
              <p className="text-sm text-gray-400 mb-5">
                Summary of the discovery scan and modernisation plan for this migration.
              </p>

              <div className="grid grid-cols-5 gap-3 mb-6">
                {[
                  { label: 'Resources scanned', value: (scanSummary?.total_resources ?? audit.findings.length).toString() },
                  { label: 'Findings', value: audit.findings.length.toString() },
                  { label: 'Compliance score', value: audit.compliance_score ? `${audit.compliance_score}/100` : '—' },
                  { label: 'Est. saving', value: `$${plan?.cost_saving_usd ?? 0}/mo` },
                  { label: 'Migration time', value: `${plan?.estimated_days ?? '—'} days` },
                ].map(s => (
                  <div key={s.label} className="border border-gray-100 rounded-xl p-4 text-center">
                    <div className="text-xl font-bold text-black mb-1">{s.value}</div>
                    <div className="text-[11px] text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-100 rounded-lg p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Source</div>
                  <div className="text-sm font-medium text-black uppercase">{scan.source_cloud} · {scanSummary?.region ?? '—'}</div>
                </div>
                <div className="border border-gray-100 rounded-lg p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Target</div>
                  <div className="text-sm font-medium text-black uppercase">{plan?.target_cloud ?? scan.target_cloud} · {plan?.target_region ?? '—'}</div>
                </div>
              </div>

              {audit.summary && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                  <span className="text-amber-500 text-sm flex-shrink-0">ⓘ</span>
                  <p className="text-xs text-amber-700 leading-relaxed">{audit.summary}</p>
                </div>
              )}

              {scanSummary?.resources && scanSummary.resources.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden mt-5">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Discovered resources</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Resource</th>
                        <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</th>
                        <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanSummary.resources.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3 font-mono text-gray-600">{r.name}</td>
                          <td className="px-5 py-3 text-gray-500">{r.type}</td>
                          <td className="px-5 py-3 text-gray-500">{r.issues?.join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Audit findings */}
          {activeStep === 'audit' && (
            <div className="max-w-5xl">
              <h2 className="text-base font-semibold text-black mb-1">Audit findings</h2>
              <p className="text-sm text-gray-400 mb-5">
                Security, compliance, and cost issues identified during discovery.
              </p>

              <div className="flex gap-3 mb-5 flex-wrap">
                {[
                  { label: 'Critical', count: audit.critical_count, color: 'bg-red-50 text-red-700' },
                  { label: 'High', count: audit.high_count, color: 'bg-orange-50 text-orange-700' },
                  { label: 'Medium', count: audit.medium_count, color: 'bg-yellow-50 text-yellow-700' },
                  { label: 'Low', count: audit.low_count, color: 'bg-gray-100 text-gray-600' },
                ].map(s => (
                  <div key={s.label} className={`px-4 py-2.5 rounded-lg ${s.color}`}>
                    <div className="text-xl font-bold">{s.count}</div>
                    <div className="text-[11px] font-medium">{s.label}</div>
                  </div>
                ))}
                {audit.cost_waste_usd > 0 && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
                    Cost waste identified: <span className="font-semibold text-black">${audit.cost_waste_usd}/mo</span>
                  </div>
                )}
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
                    {audit.findings.map((f, i) => (
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

          {/* STEP 3 — Migration plan */}
          {activeStep === 'plan' && plan && (
            <div className="max-w-5xl">
              <h2 className="text-base font-semibold text-black mb-1">Migration plan</h2>
              <p className="text-sm text-gray-400 mb-5">
                Phased approach to move this workload to {plan.target_cloud?.toUpperCase()}.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Strategy</div>
                  <div className="text-sm font-semibold text-black">{plan.strategy}</div>
                </div>
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Cost before → after</div>
                  <div className="text-sm font-semibold text-black">
                    ${plan.cost_before_usd}/mo → ${plan.cost_after_usd}/mo
                    <span className="ml-2 text-green-600">(-{plan.cost_saving_pct}%)</span>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Target</div>
                  <div className="text-sm font-semibold text-black uppercase">{plan.target_cloud} · {plan.target_region}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {plan.phases?.map((phase, i) => (
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

          {/* STEP 4 — Terraform output */}
          {activeStep === 'terraform' && (
            <div className="max-w-5xl">
              <h2 className="text-base font-semibold text-black mb-1">Terraform output</h2>
              <p className="text-sm text-gray-400 mb-5">
                Modernised infrastructure-as-code, ready to review and run.
              </p>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Modernised Terraform — {(plan?.target_cloud ?? scan.target_cloud)?.toUpperCase()} · {plan?.target_region ?? ''}
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
                <div className="p-5 bg-gray-50 overflow-auto max-h-[600px]">
                  <pre className="text-[11px] text-gray-600 font-mono leading-relaxed whitespace-pre-wrap">{scan.terraform_output}</pre>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — Audit trail (ADR) */}
          {activeStep === 'adr' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Audit trail — Architectural Decision Record</h2>
              <p className="text-sm text-gray-400 mb-5">
                A compliance-ready record of what was found, what changed, and why — for SOC 2 / ISO 27001 audit trails.
              </p>
              {plan?.adr_markdown ? (
                <div className="border border-gray-100 rounded-xl p-6">
                  {renderADRMarkdown(plan.adr_markdown)}
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl p-6 text-sm text-gray-400">
                  No ADR was generated for this migration (older migrations run before this feature was added won&apos;t have one).
                </div>
              )}
            </div>
          )}

          {/* STEP 6 — Review & export */}
          {activeStep === 'export' && (
            <div className="max-w-4xl">
              <h2 className="text-base font-semibold text-black mb-1">Review &amp; export</h2>
              <p className="text-sm text-gray-400 mb-6">
                Your complete migration blueprint. Download and hand off to your engineering team.
              </p>

              <div className="border border-gray-100 rounded-lg overflow-hidden mb-6">
                {[
                  { key: 'Source → Target', value: `${scan.source_cloud?.toUpperCase()} → ${(plan?.target_cloud ?? scan.target_cloud)?.toUpperCase()}` },
                  { key: 'Resources scanned', value: (scanSummary?.total_resources ?? audit.findings.length).toString() },
                  { key: 'Findings', value: `${audit.findings.length} findings — ${audit.critical_count} critical, ${audit.high_count} high` },
                  { key: 'Compliance score', value: audit.compliance_score ? `${audit.compliance_score}/100` : 'Not available for this scan' },
                  { key: 'Migration strategy', value: plan?.strategy ?? '—' },
                  { key: 'Monthly cost', value: plan ? `$${plan.cost_before_usd}/mo → $${plan.cost_after_usd}/mo (-${plan.cost_saving_pct}%)` : '—' },
                  { key: 'Estimated timeline', value: plan ? `${plan.estimated_days} days · ${plan.total_phases} phases` : '—' },
                  { key: 'Generated', value: new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map((row, i) => (
                  <div key={i} className="flex px-5 py-3.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500 w-44 flex-shrink-0">{row.key}</span>
                    <span className="text-sm font-medium text-black">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className={plan?.adr_markdown ? 'grid grid-cols-4 gap-3' : 'grid grid-cols-3 gap-3'}>
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
                  <span className="text-xs text-gray-400">Full migration record as JSON</span>
                </button>
                {plan?.adr_markdown && (
                  <button
                    onClick={downloadADR}
                    className="flex flex-col items-start p-5 border border-gray-100 rounded-lg hover:border-black transition-colors text-left"
                  >
                    <span className="text-xl mb-2 text-gray-400">📜</span>
                    <span className="text-sm font-medium text-black mb-1">Download ADR</span>
                    <span className="text-xs text-gray-400">Audit trail record ({plan.adr_id})</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

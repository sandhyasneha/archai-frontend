'use client'

interface AuditFindingsShape {
  findings?: unknown[]
}

interface BrownfieldScan {
  id: string
  migration_name?: string | null
  source_cloud: string
  target_cloud: string
  status: string
  audit_findings: unknown[] | AuditFindingsShape
  terraform_output: string
  created_at: string
}

interface Props {
  scans: BrownfieldScan[]
}

function findingsCount(raw: unknown[] | AuditFindingsShape): number {
  if (Array.isArray(raw)) return raw.length
  return raw?.findings?.length ?? 0
}

export default function BrownfieldTable({ scans }: Props) {
  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-8">
        <div className="text-3xl text-gray-200 mb-4">⬡</div>
        <div className="text-sm font-medium text-black mb-1">No migrations yet</div>
        <p className="text-xs text-gray-400 max-w-xs mb-5">
          Run your first Brownfield migration to scan and modernise existing infrastructure.
        </p>
        <a href="/brownfield" className="px-4 py-2 bg-black text-white rounded-md text-xs font-medium hover:opacity-85 transition-opacity">
          Start a migration
        </a>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-50">
          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Migration
          </th>
          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Status
          </th>
          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Created
          </th>
          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {scans.map((s) => (
          <tr
            key={s.id}
            className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => window.location.href = `/brownfield/${s.id}`}
          >
            <td className="px-5 py-3.5">
              <div className="text-xs font-medium text-black truncate max-w-xs">
                {s.migration_name?.trim()
                  ? s.migration_name
                  : `${s.source_cloud?.toUpperCase()} → ${s.target_cloud?.toUpperCase()} migration`}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {findingsCount(s.audit_findings)} findings
              </div>
            </td>
            <td className="px-5 py-3.5">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                s.status === 'complete'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {s.status ?? 'Draft'}
              </span>
            </td>
            <td className="px-5 py-3.5 text-[11px] text-gray-400">
              {new Date(s.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </td>
            <td className="px-5 py-3.5">
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => window.location.href = `/brownfield/${s.id}`}
                  className="text-[11px] text-gray-400 hover:text-black transition-colors px-2 py-1 rounded hover:bg-gray-100"
                >
                  View
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([s.terraform_output || ''], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `archai-migration-${s.id.slice(0, 8)}.tf`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                  className="text-[11px] text-gray-400 hover:text-black transition-colors px-2 py-1 rounded hover:bg-gray-100"
                >
                  ↓ .tf
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

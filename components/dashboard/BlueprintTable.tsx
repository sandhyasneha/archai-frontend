'use client'

import { useState } from 'react'
import BlueprintModal from './BlueprintModal'

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
  created_at: string
}

interface Props {
  blueprints: Blueprint[]
}

export default function BlueprintTable({ blueprints }: Props) {
  const [selected, setSelected] = useState<Blueprint | null>(null)

 
if (blueprints.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div className="text-3xl text-gray-200 mb-4">⌂</div>
      <div className="text-sm font-medium text-black mb-1">No blueprints yet</div>
      <p className="text-xs text-gray-400 max-w-xs mb-5">
        Create your first Greenfield project to generate a cloud architecture blueprint.
      </p>
      <a href="/project/new" className="px-4 py-2 bg-black text-white rounded-md text-xs font-medium hover:opacity-85 transition-opacity">
        Create first project
      </a>
    </div>
  )
}

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-50">
            <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Prompt
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
          {blueprints.map((b) => (
            <tr
              key={b.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelected(b)}
            >
              <td className="px-5 py-3.5">
                <div className="text-xs font-medium text-black truncate max-w-xs">
                  {b.prompt?.slice(0, 60)}{(b.prompt?.length ?? 0) > 60 ? '...' : ''}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {b.arch_plan?.provider?.toUpperCase() ?? 'AWS'} · {b.arch_plan?.region ?? 'us-east-1'}
                  {b.arch_plan?.resources?.length
                    ? ` · ${b.arch_plan.resources.length} resources`
                    : ''}
                </div>
              </td>
              <td className="px-5 py-3.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  b.audit_result === 'PASSED'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {b.audit_result ?? 'Draft'}
                </span>
              </td>
              <td className="px-5 py-3.5 text-[11px] text-gray-400">
                {new Date(b.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>


// Change the View button:
<button
  onClick={() => window.location.href = `/blueprint/${b.id}`}
  className="text-[11px] text-gray-400 hover:text-black transition-colors px-2 py-1 rounded hover:bg-gray-100"
>
  View
</button>



                                   <button
                    onClick={() => {
                      const blob = new Blob([b.terraform_code || ''], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `archai-${b.id.slice(0, 8)}.tf`
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

      {selected && (
        <BlueprintModal
          blueprint={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
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
  created_at: string
}

interface Props {
  blueprint: Blueprint
  onClose: () => void
}

export default function BlueprintModal({ blueprint, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'terraform'>('overview')
  const [copied, setCopied] = useState(false)

  function copyTerraform() {
    navigator.clipboard.writeText(blueprint.terraform_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    const data = {
      id: blueprint.id,
      prompt: blueprint.prompt,
      arch_plan: blueprint.arch_plan,
      audit_result: blueprint.audit_result,
      created_at: blueprint.created_at,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archai-blueprint-${blueprint.id.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700">
                {blueprint.audit_result}
              </span>
              <span className="text-[11px] text-gray-400">
                {blueprint.arch_plan?.provider?.toUpperCase()} · {blueprint.arch_plan?.region}
              </span>
              <span className="text-[11px] text-gray-400">
                {new Date(blueprint.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </span>
            </div>
            <p className="text-sm text-black font-medium max-w-xl leading-relaxed">
              {blueprint.prompt}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors ml-4 flex-shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100 flex gap-0 flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={[
              'px-4 py-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-black'
            ].join(' ')}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('terraform')}
            className={[
              'px-4 py-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'terraform'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-black'
            ].join(' ')}
          >
            Terraform code
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-6">

              {/* Architecture plan */}
              <div className="mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Architecture plan
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {blueprint.arch_plan?.resources?.map((r, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3">
                      <div className="text-xs font-medium text-black mb-0.5 font-mono">
                        {r.type}
                      </div>
                      <div className="text-[11px] text-gray-400">{r.purpose}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="border border-gray-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-medium text-black">
                    {blueprint.arch_plan?.resources?.length ?? 0}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Resources</div>
                </div>
                <div className="border border-gray-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-medium text-black">96</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Compliance score</div>
                </div>
                <div className="border border-gray-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-medium text-black">$438</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Est. monthly cost</div>
                </div>
              </div>

              {/* Topology SVG */}
              <div className="border border-gray-100 rounded-lg p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Network topology
                </div>
                <svg viewBox="0 0 300 180" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <marker id="marr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#ccc"/>
                    </marker>
                  </defs>
                  <rect x="90" y="8" width="120" height="24" rx="4" fill="#f4f4f4" stroke="#ccc" strokeWidth="1"/>
                  <text x="150" y="24" textAnchor="middle" fontSize="9" fill="#333">CloudFront CDN</text>
                  <line x1="150" y1="32" x2="150" y2="48" stroke="#ccc" strokeWidth="1" markerEnd="url(#marr)"/>
                  <rect x="80" y="50" width="140" height="24" rx="4" fill="#f4f4f4" stroke="#0a0a0a" strokeWidth="1.5"/>
                  <text x="150" y="66" textAnchor="middle" fontSize="9" fill="#0a0a0a" fontWeight="600">Application LB</text>
                  <line x1="115" y1="74" x2="75" y2="96" stroke="#ccc" strokeWidth="1" markerEnd="url(#marr)"/>
                  <line x1="185" y1="74" x2="225" y2="96" stroke="#ccc" strokeWidth="1" markerEnd="url(#marr)"/>
                  <rect x="15" y="98" width="110" height="24" rx="4" fill="#f4f4f4" stroke="#ccc" strokeWidth="1"/>
                  <text x="70" y="114" textAnchor="middle" fontSize="9" fill="#333">ECS us-east-1a</text>
                  <rect x="175" y="98" width="110" height="24" rx="4" fill="#f4f4f4" stroke="#ccc" strokeWidth="1"/>
                  <text x="230" y="114" textAnchor="middle" fontSize="9" fill="#333">ECS us-east-1b</text>
                  <line x1="70" y1="122" x2="120" y2="146" stroke="#ccc" strokeWidth="1" markerEnd="url(#marr)"/>
                  <line x1="230" y1="122" x2="180" y2="146" stroke="#ccc" strokeWidth="1" markerEnd="url(#marr)"/>
                  <rect x="90" y="148" width="120" height="24" rx="4" fill="#f4f4f4" stroke="#0a0a0a" strokeWidth="1.5"/>
                  <text x="150" y="164" textAnchor="middle" fontSize="9" fill="#0a0a0a" fontWeight="600">RDS PostgreSQL</text>
                </svg>
              </div>
            </div>
          )}

          {activeTab === 'terraform' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Generated Terraform HCL
                </div>
                <button
                  onClick={copyTerraform}
                  className="text-xs text-gray-400 hover:text-black transition-colors px-2 py-1 rounded hover:bg-gray-50"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-[11px] font-mono text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {blueprint.terraform_code || 'No Terraform code available'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-black rounded-md text-xs hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <div className="flex gap-2">
            <button
              onClick={downloadJSON}
              className="px-4 py-2 border border-gray-200 text-black rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              ↓ Export JSON
            </button>
            <button
              onClick={downloadTerraform}
              className="px-4 py-2 bg-black text-white rounded-md text-xs font-medium hover:opacity-85 transition-opacity"
            >
              ↓ Download Terraform
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
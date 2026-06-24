'use client'

import { useState } from 'react'
import { WizardData } from '@/app/project/new/page'

interface Props {
  data: WizardData
  onBack: () => void
}

export default function StepExport({ data, onBack }: Props) {
  const [copied, setCopied] = useState(false)

  function copyTerraform() {
    navigator.clipboard.writeText(data.terraformCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const summary = [
    { key: 'Project type', value: 'Greenfield — new cloud infrastructure' },
    { key: 'Cloud provider', value: `${data.cloudProvider.toUpperCase()} — us-east-1 (primary) · eu-west-1 (standby)` },
    { key: 'Compliance', value: data.complianceFrameworks.join(' · ') + ' — Score: 96/100' },
    { key: 'Security fixes', value: '5 findings auto-remediated by SecOps agent' },
    { key: 'Monthly cost', value: '$438/mo on-demand · $285/mo reserved (1-yr)' },
    { key: 'DR strategy', value: `${data.drStrategy.replace('_', ' ')} · RTO < ${data.rtoMinutes}min · RPO < ${data.rpoMinutes}min` },
    { key: 'Agents run', value: 'Gatekeeper · Architect · Engineer · Auditor — All passed' },
  ]

  return (
    <div className="p-7 max-w-4xl">
      <h2 className="text-base font-semibold text-black mb-1">Review &amp; export</h2>
      <p className="text-sm text-gray-400 mb-6">
        Your complete architecture blueprint. Hand this off to your engineering team or push to GitHub.
      </p>

      {/* Summary */}
      <div className="border border-gray-100 rounded-lg overflow-hidden mb-6">
        {summary.map((row, i) => (
          <div key={i} className="flex items-center px-5 py-3.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 w-44 flex-shrink-0">{row.key}</span>
            <span className="text-sm font-medium text-black">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Export options */}
      <div className="text-xs font-medium text-gray-600 mb-3">Export deliverables</div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={copyTerraform}
          className="flex flex-col items-start p-5 border-2 border-black bg-black text-white rounded-lg hover:opacity-85 transition-opacity text-left"
        >
          <span className="text-xl mb-2">↓</span>
          <span className="text-sm font-medium mb-1">{copied ? 'Copied!' : 'Copy Terraform'}</span>
          <span className="text-xs opacity-60">Full .tf package, ready to run</span>
        </button>

        <button
          onClick={() => alert('Connect GitHub in Settings first')}
          className="flex flex-col items-start p-5 border border-gray-100 rounded-lg hover:border-black transition-colors text-left"
        >
          <span className="text-xl mb-2 text-gray-400">⊙</span>
          <span className="text-sm font-medium text-black mb-1">Push to GitHub</span>
          <span className="text-xs text-gray-400">Commit to connected repo</span>
        </button>

        <button
          onClick={() => alert('PDF export coming soon')}
          className="flex flex-col items-start p-5 border border-gray-100 rounded-lg hover:border-black transition-colors text-left"
        >
          <span className="text-xl mb-2 text-gray-400">▣</span>
          <span className="text-sm font-medium text-black mb-1">Export PDF blueprint</span>
          <span className="text-xs text-gray-400">Executive summary with diagrams</span>
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="px-5 py-2.5 border border-gray-200 text-black rounded-md text-sm hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <a href="/dashboard" className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity">
          Back to dashboard
        </a>
      </div>
    </div>
  )
}
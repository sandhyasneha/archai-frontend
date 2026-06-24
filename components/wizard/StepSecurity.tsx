'use client'

import { useState } from 'react'
import { WizardData } from '@/app/project/new/page'

interface Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

const FRAMEWORKS = ['SOC 2', 'GDPR', 'HIPAA', 'PCI-DSS', 'ISO 27001']

const FINDINGS = [
  { component: 'RDS instance', severity: 'critical', risk: 'Database exposed on public subnet', resolution: 'Moved to private subnet — SG restricts inbound to ECS SG only' },
  { component: 'S3 bucket', severity: 'high', risk: 'Public read ACL enabled', resolution: 'Set block_public_acls = true, enabled versioning' },
  { component: 'IAM roles', severity: 'medium', risk: 'Wildcard * actions on managed policy', resolution: 'Replaced with least-privilege resource-level permissions' },
  { component: 'ECS tasks', severity: 'medium', risk: 'Secrets hardcoded as env vars', resolution: 'Injected AWS Secrets Manager ARN references' },
  { component: 'VPC flow logs', severity: 'low', risk: 'Flow logging not enabled', resolution: 'Added aws_flow_log resource to CloudWatch' },
]

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-yellow-50 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

export default function StepSecurity({ data, updateData, onNext, onBack }: Props) {
  function toggleFramework(fw: string) {
    const current = data.complianceFrameworks
    const updated = current.includes(fw)
      ? current.filter(f => f !== fw)
      : [...current, fw]
    updateData({ complianceFrameworks: updated })
  }

  return (
    <div className="p-7 max-w-4xl">
      <h2 className="text-base font-semibold text-black mb-1">Security &amp; compliance</h2>
      <p className="text-sm text-gray-400 mb-6">
        The SecOps agent audited your Terraform and auto-applied all remediations before you see the code.
      </p>

      {/* Compliance frameworks */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Compliance frameworks
        </label>
        <div className="flex gap-2 flex-wrap">
          {FRAMEWORKS.map(fw => (
            <button
              key={fw}
              onClick={() => toggleFramework(fw)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors',
                data.complianceFrameworks.includes(fw)
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              ].join(' ')}
            >
              <span className={[
                'w-1.5 h-1.5 rounded-full',
                data.complianceFrameworks.includes(fw) ? 'bg-white' : 'bg-gray-300'
              ].join(' ')} />
              {fw}
            </button>
          ))}
        </div>
      </div>

      {/* Audit table */}
      <div className="mb-6">
        <div className="text-xs font-medium text-gray-600 mb-2">AI audit log — auto-resolved findings</div>
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[18%]">Component</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[12%]">Severity</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[30%]">Risk found</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">AI resolution</th>
              </tr>
            </thead>
            <tbody>
              {FINDINGS.map((f, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-black font-medium">{f.component}</td>
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
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50 mb-6">
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

      <div className="flex gap-2">
        <button onClick={onBack} className="px-5 py-2.5 border border-gray-200 text-black rounded-md text-sm hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity">
          Next: cost analysis →
        </button>
      </div>
    </div>
  )
}
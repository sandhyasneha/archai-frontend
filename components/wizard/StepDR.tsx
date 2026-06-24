'use client'

import { WizardData } from '@/app/project/new/page'

interface Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

const RTO_LABELS = ['< 4 hours', '< 1 hour', '< 30 min', '< 10 min', '< 1 min']
const RPO_LABELS = ['< 24 hours', '< 1 hour', '< 15 min', '< 5 min', '< 1 min']
const RTO_VALUES = [240, 60, 30, 10, 1]
const RPO_VALUES = [1440, 60, 15, 5, 1]

const DR_STRATEGIES = [
  { value: 'backup_restore', name: 'Backup & restore', meta: 'RTO: hours · Lowest cost · Cold standby' },
  { value: 'pilot_light', name: 'Pilot light', meta: 'RTO: ~30 min · Minimal live resources' },
  { value: 'warm_standby', name: 'Warm standby', meta: 'RTO: < 1 hr · Scaled-down replica region' },
  { value: 'active_active', name: 'Multi-region active-active', meta: 'RTO: ~0 · Zero downtime · Highest cost' },
] as const

export default function StepDR({ data, updateData, onNext, onBack }: Props) {
  const rtoIndex = RTO_VALUES.indexOf(data.rtoMinutes) !== -1 ? RTO_VALUES.indexOf(data.rtoMinutes) : 1
  const rpoIndex = RPO_VALUES.indexOf(data.rpoMinutes) !== -1 ? RPO_VALUES.indexOf(data.rpoMinutes) : 2

  return (
    <div className="p-7 max-w-4xl">
      <h2 className="text-base font-semibold text-black mb-1">Disaster recovery &amp; business continuity</h2>
      <p className="text-sm text-gray-400 mb-6">
        Set your recovery targets. The DR agent will generate multi-region Terraform configurations.
      </p>

      {/* Sliders */}
      <div className="mb-6">
        <div className="text-xs font-medium text-gray-600 mb-3">Recovery objectives</div>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-xs text-gray-500 w-20 flex-shrink-0">RTO target</span>
          <input
            type="range" min={0} max={4} step={1} value={rtoIndex}
            onChange={e => updateData({ rtoMinutes: RTO_VALUES[parseInt(e.target.value)] })}
            className="flex-1 accent-black"
          />
          <span className="text-sm font-medium text-black w-20 text-right">{RTO_LABELS[rtoIndex]}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 w-20 flex-shrink-0">RPO target</span>
          <input
            type="range" min={0} max={4} step={1} value={rpoIndex}
            onChange={e => updateData({ rpoMinutes: RPO_VALUES[parseInt(e.target.value)] })}
            className="flex-1 accent-black"
          />
          <span className="text-sm font-medium text-black w-20 text-right">{RPO_LABELS[rpoIndex]}</span>
        </div>
      </div>

      {/* DR strategy cards */}
      <div className="mb-6">
        <div className="text-xs font-medium text-gray-600 mb-3">DR strategy</div>
        <div className="grid grid-cols-2 gap-3">
          {DR_STRATEGIES.map(s => (
            <button
              key={s.value}
              onClick={() => updateData({ drStrategy: s.value })}
              className={[
                'text-left border rounded-lg p-4 transition-all',
                data.drStrategy === s.value
                  ? 'border-black bg-gray-50'
                  : 'border-gray-100 hover:border-gray-300'
              ].join(' ')}
            >
              <div className="text-sm font-medium text-black mb-1">{s.name}</div>
              <div className="text-xs text-gray-400">{s.meta}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Failover map */}
      <div className="border border-gray-100 rounded-lg p-5 bg-gray-50 mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Failover topology
        </div>
        <svg viewBox="0 0 500 120" width="100%" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="15" width="160" height="85" rx="6" fill="white" stroke="#0a0a0a" strokeWidth="1.5"/>
          <text x="100" y="40" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontWeight="600">us-east-1 (Primary)</text>
          <text x="100" y="58" textAnchor="middle" fontSize="10" fill="#555">ECS cluster · RDS primary</text>
          <rect x="26" y="82" width="50" height="11" rx="3" fill="#e8f5ef"/>
          <text x="51" y="91" textAnchor="middle" fontSize="9" fill="#1a7a4a">ACTIVE</text>
          <path d="M182 50 L318 50" stroke="#ccc" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#a2)"/>
          <path d="M318 65 L182 65" stroke="#ccc" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#a2)"/>
          <defs>
            <marker id="a2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#aaa"/>
            </marker>
          </defs>
          <text x="250" y="46" textAnchor="middle" fontSize="9" fill="#888">auto-failover</text>
          <rect x="320" y="15" width="160" height="85" rx="6" fill="#fafafa" stroke="#ccc" strokeWidth="1.5" strokeDasharray="5,3"/>
          <text x="400" y="40" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontWeight="600">eu-west-1 (Standby)</text>
          <text x="400" y="58" textAnchor="middle" fontSize="10" fill="#555">ECS 0.3× · RDS replica</text>
          <rect x="326" y="82" width="50" height="11" rx="3" fill="#f4f4f4"/>
          <text x="351" y="91" textAnchor="middle" fontSize="9" fill="#888">WARM</text>
        </svg>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="px-5 py-2.5 border border-gray-200 text-black rounded-md text-sm hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity">
          Next: review &amp; export →
        </button>
      </div>
    </div>
  )
}
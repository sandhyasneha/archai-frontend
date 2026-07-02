'use client'

import { WizardData } from '@/app/project/new/page'

interface Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}

const BREAKDOWN = [
  { item: 'ECS compute (2× Fargate t3.medium)', cost: 136, pct: 31 },
  { item: 'RDS PostgreSQL multi-AZ (db.t3.medium)', cost: 198, pct: 45 },
  { item: 'CloudFront CDN + data transfer', cost: 54, pct: 12 },
  { item: 'S3 storage + backup retention', cost: 28, pct: 6 },
  { item: 'NAT Gateway + networking', cost: 22, pct: 5 },
]

const CLOUDS = [
  { name: 'Amazon Web Services', price: '$438/mo', note: 'Mature ECS ecosystem, best tooling for this stack', rec: true },
  { name: 'Google Cloud', price: '$401/mo', note: '−8.4% but requires manual region failover config', rec: false },
  { name: 'Microsoft Azure', price: '$511/mo', note: '+16.7% — premium managed PostgreSQL pricing', rec: false },
]

export default function StepCost({ data, onNext, onBack }: Props) {
  return (
    <div className="p-7 max-w-4xl">
      <h2 className="text-base font-semibold text-black mb-1">Cost &amp; budget optimisation</h2>
      <p className="text-sm text-gray-400 mb-6">
        Real-time pricing from cloud provider APIs. Recommendations based on your defined workload.
      </p>

      {/* Hero cost card */}

{/* Disclaimer */}
<div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg mb-5">
  <span className="text-amber-500 text-sm flex-shrink-0">ⓘ</span>
  <p className="text-xs text-amber-700 leading-relaxed">
    These are indicative ballpark estimates based on AWS on-demand pricing. 
    Actual costs may vary depending on your usage patterns, reserved instance 
    discounts, data transfer, and region. Use the{' '}
    <a href="https://calculator.aws/pricing/2/home" target="_blank" rel="noopener noreferrer" className="underline font-medium">
      AWS Pricing Calculator
    </a>
    {' '}for precise quotes.
  </p>
</div>

<div className="cost-sub text-xs text-gray-400 mt-1">
  Estimated ballpark figure based on standard on-demand pricing. 
  Actual costs may vary ±30% depending on usage, region, and reserved pricing.

      <div className="flex items-center justify-between p-5 border border-gray-100 rounded-lg mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            {data.cloudProvider.toUpperCase()} recommended estimate
          </div>
          <div className="text-4xl font-medium text-black tracking-tight">
            $438 <span className="text-lg text-gray-400">/mo</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            On-demand pricing. Switch to Reserved for ~35% savings ($285/mo).
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs cursor-pointer hover:bg-gray-100 transition-colors">
            Fargate Spot <span className="text-green-600 font-semibold">save $82/mo</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs cursor-pointer hover:bg-gray-100 transition-colors">
            1-yr reserved <span className="text-green-600 font-semibold">save $153/mo</span>
          </div>
        </div>
      </div>
</div>

      {/* Multi-cloud comparison */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {CLOUDS.map(c => (
          <div key={c.name} className={[
            'border rounded-lg p-4',
            c.rec ? 'border-black' : 'border-gray-100'
          ].join(' ')}>
            <div className={[
              'text-[10px] font-semibold uppercase tracking-wider mb-2',
              c.rec ? 'text-green-600' : 'text-gray-400'
            ].join(' ')}>
              {c.rec ? '✓ Recommended' : 'Alternative'}
            </div>
            <div className="text-sm font-semibold text-black mb-1">{c.name}</div>
            <div className="text-xl font-medium text-black mb-1">{c.price}</div>
            <div className="text-xs text-gray-400">{c.note}</div>
          </div>
        ))}
      </div>

      {/* Cost breakdown */}
      <div className="border border-gray-100 rounded-lg overflow-hidden mb-6">
        {BREAKDOWN.map((item, i) => (
          <div key={i} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">{item.item}</div>
              <div className="h-1 bg-gray-100 rounded overflow-hidden w-48">
                <div className="h-full bg-black rounded" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
            <div className="text-sm font-medium text-black">${item.cost}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="px-5 py-2.5 border border-gray-200 text-black rounded-md text-sm hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onNext} className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity">
          Next: disaster recovery →
        </button>
      </div>
    </div>
  )
}
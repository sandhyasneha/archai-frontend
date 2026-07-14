import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import BlueprintTable from '@/components/dashboard/BlueprintTable'
import BrownfieldTable from '@/components/dashboard/BrownfieldTable'
import NewProjectMenu from '@/components/dashboard/NewProjectMenu'

interface NavItemProps {
  icon: string
  label: string
  href: string
  active?: boolean
  disabled?: boolean
  badge?: string
}

function NavItem(props: NavItemProps) {
  const { icon, label, href, active, disabled, badge } = props
  const base = 'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors'
  const activeClass = active ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black'
  const disabledClass = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
  return (
    <a href={disabled ? undefined : href} className={`${base} ${activeClass} ${disabledClass}`}>
      <span className="text-base w-4 flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 border border-dashed border-gray-300 rounded-full text-gray-400">
          {badge}
        </span>
      )}
    </a>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (!user.email_confirmed_at) redirect(`/verify?email=${encodeURIComponent(user.email ?? '')}`)

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: blueprints },
    { data: projects },
    { data: adminCheck },
    { data: brownfieldScans },
  ] = await Promise.all([
    supabase.from('blueprints').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    serviceClient.from('admin_users').select('id').eq('id', user.id).single(),
    supabase.from('brownfield_scans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  const isAdmin = !!adminCheck
  const blueprintCount = blueprints?.length ?? 0
  const projectCount = projects?.length ?? 0
  const brownfieldCount = brownfieldScans?.length ?? 0

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there'
  const orgName = user.user_metadata?.org_name || user.email?.split('@')[1]?.split('.')[0] || 'Your Organisation'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const stats = [
    { label: 'Projects', value: projectCount.toString(), delta: projectCount === 0 ? 'No projects yet' : `${projectCount} active` },
    { label: 'Cloud spend (est.)', value: blueprintCount > 0 ? '$438' : '$0', delta: 'Monthly estimate' },
    { label: 'Compliance score', value: blueprintCount > 0 ? '96' : '—', delta: blueprintCount > 0 ? 'SOC 2 + GDPR' : 'Run a blueprint first' },
    { label: 'Blueprints generated', value: blueprintCount.toString(), delta: 'This billing cycle' },
    { label: 'Migrations run', value: brownfieldCount.toString(), delta: brownfieldCount === 0 ? 'No migrations yet' : 'This billing cycle' },
  ]

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
        </div>
        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">Workspace</p>
          <NavItem icon="▦" label="Dashboard" active={true} href="/dashboard" />
          <NavItem icon="⌂" label="Greenfield" href="/project/new" />
          <NavItem icon="⬡" label="Brownfield" href="/brownfield" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-4 pb-1">Configuration</p>
          <NavItem icon="⊟" label="Knowledge base" href="/knowledge-base" />
          <NavItem icon="⚙" label="Settings" href="/settings" />
          <NavItem icon="📖" label="Docs" href="/doc" />
          {isAdmin && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-4 pb-1">Admin</p>
              <NavItem icon="▲" label="Admin panel" href="/admin" />
            </>
          )}
        </div>
        <div className="px-3 py-3.5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-black truncate">{displayName}</div>
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
            <a href="/api/auth/signout" className="text-gray-400 hover:text-black text-xs px-1.5 py-1 rounded hover:bg-gray-50 transition-colors">
              ↩
            </a>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">Dashboard</div>
          <NewProjectMenu />
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <div className="mb-7">
            <h1 className="text-xl font-medium text-black mb-1">Good day, {displayName.split(' ')[0]}</h1>
            <p className="text-sm text-gray-400">{orgName} workspace</p>
          </div>

          <div className="grid grid-cols-5 gap-3.5 mb-7">
            {stats.map((s) => (
              <div key={s.label} className="border border-gray-100 rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{s.label}</div>
                <div className="text-3xl font-medium text-black tracking-tight mb-1.5">{s.value}</div>
                <div className="text-[11px] text-gray-400">{s.delta}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-black">Recent blueprints</span>
                <a href="/project/new" className="text-xs text-gray-400 hover:text-black transition-colors">+ New</a>
              </div>
              <BlueprintTable blueprints={blueprints ?? []} />
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <span className="text-sm font-semibold text-black">Activity</span>
              </div>
              {blueprintCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                  <div className="text-3xl text-gray-200 mb-4">◎</div>
                  <div className="text-sm font-medium text-black mb-1">No activity yet</div>
                  <p className="text-xs text-gray-400">Agent runs and exports will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {blueprints?.slice(0, 6).map((b) => (
                    <div key={b.id} className="px-5 py-3.5 flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                      <div>
                        <div className="text-xs text-black">
                          Blueprint generated — {b.audit_result === 'PASSED' ? 'all agents passed' : 'draft saved'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {b.arch_plan?.provider?.toUpperCase() ?? 'AWS'} · {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden mt-5">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-black">Recent brownfield migrations</span>
              <a href="/brownfield" className="text-xs text-gray-400 hover:text-black transition-colors">+ New</a>
            </div>
            <BrownfieldTable scans={brownfieldScans ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}
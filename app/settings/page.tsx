import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import SettingsClient from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (!user.email_confirmed_at) redirect(`/verify?email=${encodeURIComponent(user.email ?? '')}`)

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
  const orgName = user.user_metadata?.org_name || user.email?.split('@')[1]?.split('.')[0] || ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: subscription }, { data: plans }] = await Promise.all([
    serviceClient
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    serviceClient
      .from('plans')
      .select('*')
      .order('price_monthly', { ascending: true }),
  ])

  // No active subscription row means Scout (free) — count this month's
  // blueprints directly, matching the same logic the generate route enforces.
  let scoutBlueprintsUsed = 0
  if (!subscription) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count } = await serviceClient
      .from('blueprints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
    scoutBlueprintsUsed = count ?? 0
  }

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email ?? '',
        full_name: displayName,
        org_name: orgName,
        initials,
        created_at: user.created_at,
      }}
      subscription={subscription}
      plans={plans ?? []}
      scoutBlueprintsUsed={scoutBlueprintsUsed}
    />
  )
}

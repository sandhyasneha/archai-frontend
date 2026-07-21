import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import BrownfieldClient from '@/components/brownfield/BrownfieldClient'

export default async function BrownfieldPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (!user.email_confirmed_at) redirect(`/verify?email=${encodeURIComponent(user.email ?? '')}`)

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const plan = subscription?.plans as { name: string } | null
  const isPlanAllowed = plan ? ['team', 'momentum', 'enterprise'].includes(plan.name) : false

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <BrownfieldClient
      user={{ id: user.id, email: user.email ?? '', full_name: displayName, initials }}
      isPlanAllowed={isPlanAllowed}
    />
  )
}

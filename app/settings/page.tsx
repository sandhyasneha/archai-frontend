import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (!user.email_confirmed_at) redirect(`/verify?email=${encodeURIComponent(user.email ?? '')}`)

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
  const orgName = user.user_metadata?.org_name || user.email?.split('@')[1]?.split('.')[0] || ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

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
    />
  )
}
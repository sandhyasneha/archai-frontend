import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BrownfieldDetailClient from '@/components/brownfield/BrownfieldDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BrownfieldDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: scan } = await supabase
    .from('brownfield_scans')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!scan) redirect('/brownfield')

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <BrownfieldDetailClient
      scan={scan}
      user={{ email: user.email ?? '', full_name: displayName, initials }}
    />
  )
}

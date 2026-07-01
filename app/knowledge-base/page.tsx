import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KnowledgeBaseClient from '@/components/knowledge-base/KnowledgeBaseClient'

export default async function KnowledgeBasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (!user.email_confirmed_at) redirect(`/verify?email=${encodeURIComponent(user.email ?? '')}`)

  const { data: files } = await supabase.storage
    .from('knowledge-base')
    .list(`${user.id}/`, { sortBy: { column: 'created_at', order: 'desc' } })

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <KnowledgeBaseClient
      user={{ id: user.id, email: user.email ?? '', full_name: displayName, initials }}
      initialFiles={(files ?? []).map(f => ({
        ...f,
        metadata: f.metadata ?? undefined,
      }))}
    />
  )
}
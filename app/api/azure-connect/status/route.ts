import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase
    .from('azure_connections')
    .select('id, subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('verified_at', { ascending: false })
    .limit(1)
    .single()

  return Response.json({ connection: data ?? null })
}

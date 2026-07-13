import { createClient } from '@/lib/supabase/server'
import { buildAdminConsentUrl } from '@/lib/azure-connect/msal'
import crypto from 'crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const state = crypto.randomBytes(16).toString('hex')

  const { data, error } = await supabase
    .from('azure_connections')
    .insert({ user_id: user.id, state, status: 'pending' })
    .select('id, state')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/azure-connect/callback`
  const adminConsentUrl = buildAdminConsentUrl(state, redirectUri)

  return Response.json({ connection_id: data.id, admin_consent_url: adminConsentUrl })
}

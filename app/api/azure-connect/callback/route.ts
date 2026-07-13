import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tenant = url.searchParams.get('tenant')
  const state = url.searchParams.get('state')
  const adminConsent = url.searchParams.get('admin_consent')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !state) {
    const msg = encodeURIComponent(errorDescription || error || 'Consent was not completed')
    return Response.redirect(`${appUrl}/brownfield?azure_step=error&message=${msg}`)
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // state is a unique, unguessable per-connection token — it is the
  // security boundary here, the same way a password-reset link token
  // authorises an action without requiring re-authentication.
  const { data: connection } = await serviceClient
    .from('azure_connections')
    .select('id')
    .eq('state', state)
    .single()

  if (!connection) {
    return Response.redirect(`${appUrl}/brownfield?azure_step=error&message=${encodeURIComponent('Connection not found or expired')}`)
  }

  if (adminConsent !== 'True' || !tenant) {
    await serviceClient.from('azure_connections').update({ status: 'failed' }).eq('id', connection.id)
    return Response.redirect(`${appUrl}/brownfield?azure_step=error&message=${encodeURIComponent('Admin consent was not granted')}`)
  }

  await serviceClient
    .from('azure_connections')
    .update({ tenant_id: tenant, status: 'consented', consented_at: new Date().toISOString() })
    .eq('id', connection.id)

  return Response.redirect(`${appUrl}/brownfield?azure_step=rbac&connection_id=${connection.id}`)
}

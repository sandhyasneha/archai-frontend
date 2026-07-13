import { createClient } from '@/lib/supabase/server'
import { getServiceAccountEmail } from '@/lib/gcp-connect/auth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    return Response.json({ service_account_email: getServiceAccountEmail() })
  } catch {
    return Response.json({ error: 'GCP service account not configured yet' }, { status: 500 })
  }
}

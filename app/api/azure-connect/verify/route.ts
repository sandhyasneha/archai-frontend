import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acquireManagementToken } from '@/lib/azure-connect/msal'
import { z } from 'zod'

const Schema = z.object({
  connection_id: z.string().uuid(),
  subscription_id: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { connection_id, subscription_id } = parsed.data

  const { data: connection } = await supabase
    .from('azure_connections')
    .select('id, tenant_id, user_id')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .single()

  if (!connection || !connection.tenant_id) {
    return Response.json({ error: 'Connection not found or admin consent not completed' }, { status: 404 })
  }

  try {
    const token = await acquireManagementToken(connection.tenant_id)

    // A lightweight real ARM call — if Reader wasn't assigned, this fails
    // with 403 even though token acquisition (identity) succeeded.
    const res = await fetch(
      `https://management.azure.com/subscriptions/${subscription_id}/providers/Microsoft.Compute/virtualMachines?api-version=2024-07-01`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      await supabase.from('azure_connections').update({ status: 'failed' }).eq('id', connection_id)
      return Response.json({
        error: 'Could not read resources in this subscription',
        message: body.slice(0, 300),
        hint: 'Confirm the Reader role was assigned to the ArchAI app in Subscription -> Access control (IAM), and that the Subscription ID is correct.',
      }, { status: 400 })
    }

    await supabase
      .from('azure_connections')
      .update({ subscription_id, status: 'active', verified_at: new Date().toISOString() })
      .eq('id', connection_id)

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({
      error: 'Verification failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 400 })
  }
}

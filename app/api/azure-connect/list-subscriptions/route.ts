import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acquireManagementToken } from '@/lib/azure-connect/msal'
import { z } from 'zod'

const Schema = z.object({
  connection_id: z.string().uuid(),
})

interface ArmSubscription {
  subscriptionId: string
  displayName: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { data: connection } = await supabase
    .from('azure_connections')
    .select('id, tenant_id, user_id')
    .eq('id', parsed.data.connection_id)
    .eq('user_id', user.id)
    .single()

  if (!connection || !connection.tenant_id) {
    return Response.json({ error: 'Connection not found or admin consent not completed' }, { status: 404 })
  }

  try {
    const token = await acquireManagementToken(connection.tenant_id)
    const res = await fetch('https://management.azure.com/subscriptions?api-version=2020-01-01', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      // Most commonly means Reader hasn't been assigned to any
      // subscription yet — not a hard error, just "nothing visible yet".
      return Response.json({ subscriptions: [] })
    }

    const data = await res.json()
    const subscriptions: ArmSubscription[] = (data.value ?? []).map((s: { subscriptionId: string; displayName: string }) => ({
      subscriptionId: s.subscriptionId,
      displayName: s.displayName,
    }))

    return Response.json({ subscriptions })
  } catch {
    return Response.json({ subscriptions: [] })
  }
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRoleAssumable } from '@/lib/aws-connect/sts'
import { z } from 'zod'

const Schema = z.object({
  connection_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { connection_id } = parsed.data

  const { data: connection } = await supabase
    .from('aws_connections')
    .select('id, external_id, role_arn, user_id')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .single()

  if (!connection) return Response.json({ error: 'Connection not found' }, { status: 404 })
  if (!connection.role_arn) {
    return Response.json({ error: 'No Role ARN computed for this connection — try starting the connection again.' }, { status: 400 })
  }

  const result = await verifyRoleAssumable(connection.role_arn, connection.external_id)

  if (!result.ok) {
    await supabase
      .from('aws_connections')
      .update({ status: 'failed' })
      .eq('id', connection_id)
    return Response.json({
      error: 'Could not assume this role',
      message: result.error,
      hint: 'Confirm the CloudFormation stack finished creating successfully (status CREATE_COMPLETE), and that the AWS Account ID you entered matches the account you created the stack in.',
    }, { status: 400 })
  }

  await supabase
    .from('aws_connections')
    .update({ status: 'active', verified_at: new Date().toISOString() })
    .eq('id', connection_id)

  return Response.json({ ok: true, assumed_as: result.assumedArn })
}

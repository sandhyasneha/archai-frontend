import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRoleAssumable } from '@/lib/aws-connect/sts'
import { z } from 'zod'

const Schema = z.object({
  connection_id: z.string().uuid(),
  role_arn: z.string().min(20).regex(/^arn:aws:iam::\d{12}:role\/.+$/, 'Not a valid IAM role ARN'),
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

  const { connection_id, role_arn } = parsed.data

  const { data: connection } = await supabase
    .from('aws_connections')
    .select('id, external_id, user_id')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .single()

  if (!connection) return Response.json({ error: 'Connection not found' }, { status: 404 })

  const result = await verifyRoleAssumable(role_arn, connection.external_id)

  if (!result.ok) {
    await supabase
      .from('aws_connections')
      .update({ status: 'failed' })
      .eq('id', connection_id)
    return Response.json({
      error: 'Could not assume this role',
      message: result.error,
      hint: 'Double-check the Role ARN was copied exactly from the CloudFormation Outputs tab, and that the stack finished creating successfully.',
    }, { status: 400 })
  }

  await supabase
    .from('aws_connections')
    .update({ role_arn, status: 'active', verified_at: new Date().toISOString() })
    .eq('id', connection_id)

  return Response.json({ ok: true, assumed_as: result.assumedArn })
}

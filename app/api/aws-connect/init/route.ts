import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { z } from 'zod'

const Schema = z.object({
  region: z.string().min(1).default('us-east-1'),
  account_id: z.string().regex(/^\d{12}$/, 'AWS Account ID must be exactly 12 digits'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { region, account_id } = parsed.data

  const externalId = `archai-${crypto.randomBytes(16).toString('hex')}`

  const { data, error } = await supabase
    .from('aws_connections')
    .insert({
      user_id: user.id,
      external_id: externalId,
      region,
      account_id,
      status: 'pending',
    })
    .select('id, external_id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const templateUrl = process.env.ARCHAI_CFN_TEMPLATE_URL
  if (!templateUrl) {
    return Response.json({ error: 'ArchAI CloudFormation template is not configured yet' }, { status: 500 })
  }

  const stackName = `ArchAI-ReadOnly-${data.id.slice(0, 8)}`
  // Matches the CFN template's RoleName: !Sub 'ArchAI-ReadOnly-${AWS::StackName}'
  const roleArn = `arn:aws:iam::${account_id}:role/ArchAI-ReadOnly-${stackName}`

  await supabase.from('aws_connections').update({ role_arn: roleArn }).eq('id', data.id)

  const quickCreateUrl =
    `https://console.aws.amazon.com/cloudformation/home?region=${encodeURIComponent(region)}` +
    `#/stacks/quickcreate?stackName=${stackName}` +
    `&templateURL=${encodeURIComponent(templateUrl)}` +
    `&param_ExternalId=${encodeURIComponent(externalId)}`

  return Response.json({
    connection_id: data.id,
    external_id: data.external_id,
    role_arn: roleArn,
    quick_create_url: quickCreateUrl,
  })
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { z } from 'zod'

const Schema = z.object({
  region: z.string().min(1).default('us-east-1'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  const region = parsed.success ? parsed.data.region : 'us-east-1'

  const externalId = `archai-${crypto.randomBytes(16).toString('hex')}`

  const { data, error } = await supabase
    .from('aws_connections')
    .insert({
      user_id: user.id,
      external_id: externalId,
      region,
      status: 'pending',
    })
    .select('id, external_id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const templateUrl = process.env.ARCHAI_CFN_TEMPLATE_URL
  if (!templateUrl) {
    return Response.json({ error: 'ArchAI CloudFormation template is not configured yet' }, { status: 500 })
  }

  const quickCreateUrl =
    `https://console.aws.amazon.com/cloudformation/home?region=${encodeURIComponent(region)}` +
    `#/stacks/quickcreate?stackName=ArchAI-ReadOnly-Access` +
    `&templateURL=${encodeURIComponent(templateUrl)}` +
    `&param_ExternalId=${encodeURIComponent(externalId)}`

  return Response.json({
    connection_id: data.id,
    external_id: data.external_id,
    quick_create_url: quickCreateUrl,
  })
}

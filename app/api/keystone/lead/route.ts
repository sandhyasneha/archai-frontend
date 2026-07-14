import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().trim().email(),
  context: z.string().trim().max(1000).optional().default(''),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { email, context } = parsed.data

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceClient.from('contact_submissions').insert({
    first_name: 'Keystone visitor',
    last_name: '',
    email,
    company: null,
    plan_interest: null,
    message: `Left their email while chatting with Keystone (pre-signup). Last topic: ${context.slice(0, 500) || 'not captured'}`,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

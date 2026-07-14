import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { runKeystoneGatekeeper } from '@/lib/agents/keystone-gatekeeper'
import { runKeystoneAnswer, KeystoneMessage } from '@/lib/agents/keystone'

const COST_PER_INPUT_TOKEN = 0.000003
const COST_PER_OUTPUT_TOKEN = 0.000015

const Schema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(10)
    .optional()
    .default([]),
})

const OFF_TOPIC_REPLY =
  "I'm Keystone, ArchAI's support assistant — I can only help with using ArchAI itself (Greenfield, Brownfield, plans, your account, and so on). Is there something about ArchAI I can help with?"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { message, history } = parsed.data

  // Auth is optional — Keystone can help signed-out visitors with sign-in,
  // plans, and general "how does this work" questions too.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isValid = await runKeystoneGatekeeper(message)
  if (!isValid) {
    return Response.json({ reply: OFF_TOPIC_REPLY, link: null })
  }

  const conversation: KeystoneMessage[] = [...history, { role: 'user', content: message }]
  const { reply, link, tokensIn, tokensOut } = await runKeystoneAnswer(conversation)

  if (user) {
    try {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const cost = tokensIn * COST_PER_INPUT_TOKEN + tokensOut * COST_PER_OUTPUT_TOKEN
      await serviceClient.from('usage_logs').insert({
        user_id: user.id,
        blueprint_id: null,
        agent: 'keystone',
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: cost,
      })
    } catch {
      // Usage logging is best-effort — never block the reply on it.
    }
  }

  return Response.json({ reply, link })
}

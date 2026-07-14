import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

const SYSTEM_PROMPT = `You are an input filter for Keystone, the support assistant of ArchAI — an
AI-powered cloud architecture SaaS platform (Greenfield infrastructure design, Brownfield migration,
Knowledge Base, plans/pricing, sign-in/accounts, dashboard, settings).

Analyse the user message and decide if it is asking about using ArchAI itself: signing in or accounts,
the dashboard, Greenfield, Brownfield, the Knowledge Base, plans/pricing/billing, settings/admin, or how
to accomplish some task inside ArchAI. General cloud/DevOps/Terraform questions asked in the context of
"how do I do this in ArchAI" also count as valid.

Anything else — general knowledge, other products, entertainment, sports, politics, personal advice,
unrelated coding help, or small talk unconnected to ArchAI — is invalid.

Output ONLY one of these two strings — nothing else:
- VALID_ARCHAI_PROMPT
- INVALID_PROMPT`

export async function runKeystoneGatekeeper(message: string): Promise<boolean> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 20,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message.slice(0, 2000) }],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()
  return text === 'VALID_ARCHAI_PROMPT'
}

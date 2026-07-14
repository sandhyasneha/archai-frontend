import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { KEYSTONE_KNOWLEDGE, KEYSTONE_LINKS } from '@/lib/keystone/knowledge'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

export interface KeystoneMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface KeystoneReply {
  reply: string
  link: { url: string; label: string } | null
  tokensIn: number
  tokensOut: number
}

const LINK_KEYS = Object.keys(KEYSTONE_LINKS).join(', ')

function systemPrompt(): string {
  return `You are Keystone, the in-app support assistant for ArchAI. You ONLY answer questions about
using ArchAI itself, based strictly on the product knowledge below. Be concise, friendly, and modern in
tone — a few sentences, not an essay. Use plain language, no unexplained jargon.

If a step-by-step answer would help, use short numbered steps instead of a wall of text.

If one specific page in the app would help the user continue, include a deep-link by choosing ONE key
from this list: ${LINK_KEYS}. Otherwise use null. Never invent a link key that isn't in that list.

Respond with ONLY a JSON object, no markdown, no explanation, in exactly this shape:
{"reply": "your answer text", "link_key": "dashboard" | null, "link_label": "short button text" | null}

PRODUCT KNOWLEDGE:
${KEYSTONE_KNOWLEDGE}`
}

function fixJson(str: string): string {
  const ob = (str.match(/\{/g) || []).length
  const cb = (str.match(/\}/g) || []).length
  let out = str
  for (let i = 0; i < ob - cb; i++) out += '}'
  return out
}

export async function runKeystoneAnswer(
  history: KeystoneMessage[]
): Promise<KeystoneReply> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemPrompt(),
    messages: history.slice(-10).map(m => ({ role: m.role, content: m.content.slice(0, 2000) })),
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const tokensIn = response.usage?.input_tokens ?? 0
  const tokensOut = response.usage?.output_tokens ?? 0

  const fallback: KeystoneReply = {
    reply: "Sorry, I couldn't quite process that — could you rephrase your question about ArchAI?",
    link: null,
    tokensIn,
    tokensOut,
  }

  if (start === -1) return fallback

  const end = cleaned.lastIndexOf('}')
  const jsonStr = end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start)

  try {
    const parsed = JSON.parse(jsonStr) as { reply: string; link_key: string | null; link_label: string | null }
    const url = parsed.link_key ? KEYSTONE_LINKS[parsed.link_key] : undefined
    return {
      reply: parsed.reply,
      link: url ? { url, label: parsed.link_label || 'Take me there' } : null,
      tokensIn,
      tokensOut,
    }
  } catch {
    try {
      const parsed = JSON.parse(fixJson(jsonStr)) as { reply: string; link_key: string | null; link_label: string | null }
      const url = parsed.link_key ? KEYSTONE_LINKS[parsed.link_key] : undefined
      return {
        reply: parsed.reply,
        link: url ? { url, label: parsed.link_label || 'Take me there' } : null,
        tokensIn,
        tokensOut,
      }
    } catch {
      return fallback
    }
  }
}

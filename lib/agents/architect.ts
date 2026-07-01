import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ArchPlan } from '@/types'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

const SYSTEM_PROMPT = 'You are a cloud architect. Output ONLY a JSON object. Maximum 4 resources. Each purpose under 6 words. No markdown. Example: {"provider":"aws","region":"us-east-1","resources":[{"type":"vpc","purpose":"isolated network"},{"type":"ecs_cluster","purpose":"run containerised services"},{"type":"rds_postgres","purpose":"managed database"},{"type":"alb","purpose":"load balancer"}]}'

const DEFAULT_PLAN: ArchPlan = {
  provider: 'aws',
  region: 'us-east-1',
  resources: [
    { type: 'vpc', purpose: 'isolated network with subnets' },
    { type: 'ecs_cluster', purpose: 'run containerised services' },
    { type: 'rds_postgres', purpose: 'managed relational database' },
    { type: 'alb', purpose: 'application load balancer' },
  ],
}

function fixJson(str: string): string {
  const ob = (str.match(/\{/g) || []).length
  const cb = (str.match(/\}/g) || []).length
  const oq = (str.match(/\[/g) || []).length
  const cq = (str.match(/\]/g) || []).length
  let out = str
  for (let i = 0; i < oq - cq; i++) out += ']'
  for (let i = 0; i < ob - cb; i++) out += '}'
  return out
}




export async function runArchitect(prompt: string, kbContext?: string): Promise<ArchPlan> {
  const contextSection = kbContext
    ? `\n\nORGANISATION STANDARDS (follow these exactly):\n${kbContext.slice(0, 1500)}`
    : ''

  const userMessage = `${prompt.slice(0, 300)}${contextSection}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return DEFAULT_PLAN
  const end = cleaned.lastIndexOf('}')
  const jsonStr = end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start)
  try {
    const parsed = JSON.parse(jsonStr) as ArchPlan
    if (parsed.resources && parsed.resources.length > 4) parsed.resources = parsed.resources.slice(0, 4)
    return parsed
  } catch {
    try {
      const parsed = JSON.parse(fixJson(jsonStr)) as ArchPlan
      if (parsed.resources && parsed.resources.length > 4) parsed.resources = parsed.resources.slice(0, 4)
      return parsed
    } catch {
      return DEFAULT_PLAN
    }
  }
}
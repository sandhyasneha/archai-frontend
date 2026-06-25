import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { ArchPlan } from '@/types';

const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are a cloud architect. Output ONLY a JSON object, nothing else.

STRICT RULES:
- Maximum 4 resources total
- Each "purpose" must be under 6 words
- No markdown, no explanation, no extra text

Example output:
{"provider":"aws","region":"us-east-1","resources":[{"type":"vpc","purpose":"isolated network with subnets"},{"type":"ecs_cluster","purpose":"run containerised services"},{"type":"rds_postgres","purpose":"managed relational database"},{"type":"alb","purpose":"application load balancer"}]}`;

export async function runArchitect(prompt: string): Promise<ArchPlan> {
  const truncatedPrompt = prompt.slice(0, 300)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: truncatedPrompt }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()

  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return {
      provider: 'aws',
      region: 'us-east-1',
      resources: [
        { type: 'vpc', purpose: 'isolated network with subnets' },
        { type: 'ecs_cluster', purpose: 'run containerised services' },
        { type: 'rds_postgres', purpose: 'managed relational database' },
        { type: 'alb', purpose: 'application load balancer' },
      ],
    }
  }

  let jsonStr = jsonMatch[0]

  try {
    const parsed = JSON.parse(jsonStr) as ArchPlan
    if (parsed.resources?.length > 4) {
      parsed.resources = parsed.resources.slice(0, 4)
    }
    return parsed
  } catch {
    const openBraces = (jsonStr.match(/\{/g) || []).length
    const closeBraces = (jsonStr.match(/\}/g) || []).length
    const openBrackets = (jsonStr.match(/\[/g) || []).length
    const closeBrackets = (jsonStr.match(/\]/g) || []).length

    jsonStr = jsonStr.replace(/,\s*\{[^}]*$/, '')
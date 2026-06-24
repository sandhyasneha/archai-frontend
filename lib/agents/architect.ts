
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { ArchPlan } from '@/types';

const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are an expert Enterprise Cloud Architect.
Analyse the infrastructure request and break it down into required cloud resources.
Output ONLY a valid JSON object — no explanations, no markdown, no code fences.

Format:
{
  "provider": "aws",
  "region": "us-east-1",
  "resources": [
    { "type": "vpc", "purpose": "isolated network with public and private subnets" },
    { "type": "ecs_cluster", "purpose": "run containerised microservices" }
  ]
}`;

export async function runArchitect(prompt: string): Promise<ArchPlan> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()

  // Extract JSON even if there's surrounding text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Architect agent returned no JSON: ${text.slice(0, 200)}`)
  }

  try {
    return JSON.parse(jsonMatch[0]) as ArchPlan
  } catch {
    throw new Error(`Architect agent returned invalid JSON: ${jsonMatch[0].slice(0, 200)}`)
  }
}
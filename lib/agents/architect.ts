import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { ArchPlan } from '@/types';

const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are a cloud architect. Output ONLY a JSON object, nothing else.

STRICT RULES:
- Maximum 4 resources total
- Each "purpose" must be under 6 words
- Output must fit in 300 tokens
- No markdown, no explanation, no extra text

Example output:
{"provider":"aws","region":"us-east-1","resources":[{"type":"vpc","purpose":"isolated network with subnets"},{"type":"ecs_cluster","purpose":"run containerised services"},{"type":"rds_postgres","purpose":"managed relational database"},{"type":"alb","purpose":"application load balancer"}]}`;

export async function runArchitect(prompt: string): Promise<ArchPlan> {
  // Truncate prompt to avoid large inputs
  const truncatedPrompt = prompt.slice(0, 300)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: truncatedPrompt }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()

  // Clean any markdown fences
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  // Try to find and parse JSON
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are an input filter for an Enterprise Cloud Infrastructure SaaS platform.
Analyse the user prompt and determine if it is related to cloud computing, IT infrastructure, 
network design, server management, databases, DevOps, or system architecture.

Output ONLY one of these two strings — nothing else:
- VALID_CLOUD_PROMPT
- INVALID_PROMPT`;

export async function runGatekeeper(prompt: string): Promise<boolean> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 20,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (response.content[0] as { type: string; text: string }).text.trim();
  return text === 'VALID_CLOUD_PROMPT';
}
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { ArchPlan } from '@/types';

const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are a Senior DevOps Engineer specialising in HashiCorp Terraform.
Given a JSON architecture plan, generate complete, ready-to-run Terraform HCL code.

Rules:
1. Use only official stable provider modules (e.g. terraform-aws-modules/vpc/aws).
2. Every resource block must be syntactically complete — no TODO comments, no placeholder ellipsis.
3. Every opening brace must have a matching closing brace.
4. Output ONLY the raw Terraform code — no markdown fences, no explanations.`;

export async function runEngineer(
  plan: ArchPlan,
  previousError?: string
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [];

  if (previousError) {
    messages.push({
      role: 'user',
      content: `Architecture plan: ${JSON.stringify(plan, null, 2)}\n\nPrevious attempt was REJECTED with error: ${previousError}\n\nPlease fix the issues and regenerate the complete Terraform code.`,
    });
  } else {
    messages.push({
      role: 'user',
      content: `Generate Terraform code for this architecture plan:\n${JSON.stringify(plan, null, 2)}`,
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages,
  });

  return (response.content[0] as { type: string; text: string }).text.trim();
}
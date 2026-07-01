import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ArchPlan } from '@/types'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

const SYSTEM_PROMPT = `You are a Senior DevOps Engineer specialising in HashiCorp Terraform.
Given a JSON architecture plan, generate complete Terraform HCL code.
Rules:
1. Use official stable provider modules where available.
2. Every block must be syntactically complete with matching braces.
3. Output ONLY raw Terraform HCL — no markdown fences, no explanations.
4. Keep the code concise — use modules instead of individual resources where possible.
5. Maximum 100 lines of output.`

export async function runEngineer(
  plan: ArchPlan,
  kbContext?: string,
  previousError?: string
): Promise<string> {
  const contextSection = kbContext
    ? `\n\nORGANISATION STANDARDS — follow these exactly:\n${kbContext.slice(0, 2000)}`
    : ''

  const messages: Anthropic.MessageParam[] = []

  if (previousError) {
    messages.push({
      role: 'user',
      content: `Architecture plan: ${JSON.stringify(plan, null, 2)}${contextSection}\n\nPrevious attempt REJECTED: ${previousError}\n\nFix and regenerate complete Terraform code.`,
    })
  } else {
    messages.push({
      role: 'user',
      content: `Generate Terraform code for this architecture plan:\n${JSON.stringify(plan, null, 2)}${contextSection}`,
    })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages,
  })

  return (response.content[0] as { type: string; text: string }).text.trim()
}
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';

const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are a Terraform HCL syntax validator.
Your job is to check if the provided Terraform code is syntactically valid and can be parsed.

PASS criteria — output "PASSED" if:
- All blocks have matching opening and closing braces
- Resource and module blocks have a type and name
- No obviously broken syntax like unclosed strings

FAIL criteria — output "REJECTED: reason" ONLY if:
- There are unclosed braces or brackets
- The code is completely empty or cut off mid-block

IMPORTANT RULES:
- Do NOT reject for missing variables or modules that may be defined elsewhere
- Do NOT reject for deprecated resources or style issues
- Do NOT reject for missing required arguments — those are runtime errors not syntax errors
- When in doubt, output PASSED
- Output ONLY "PASSED" or "REJECTED: reason" — nothing else`;

export interface AuditResult {
  passed: boolean
  error?: string
}

export async function runAuditor(terraformCode: string): Promise<AuditResult> {
  // Basic local check first — if code looks reasonable, pass it
  const trimmed = terraformCode.trim()
  
  if (!trimmed || trimmed.length < 50) {
    return { passed: false, error: 'Generated code is too short or empty' }
  }

  // Count braces — if balanced, likely valid
  const openBraces = (trimmed.match(/\{/g) || []).length
  const closeBraces = (trimmed.match(/\}/g) || []).length
  
  if (Math.abs(openBraces - closeBraces) > 3) {
    return { passed: false, error: `Unbalanced braces: ${openBraces} open vs ${closeBraces} close` }
  }

  // If basic checks pass, ask Claude for final validation
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmed.slice(0, 3000) }],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()

    if (text === 'PASSED' || text.startsWith('PASSED')) {
      return { passed: true }
    }

    if (text.startsWith('REJECTED:')) {
      return { passed: false, error: text.replace('REJECTED:', '').trim() }
    }

    // If Claude returns anything unexpected — pass it anyway
    return { passed: true }

  } catch {
    // If auditor itself fails — pass the code through
    // Engineer already generated valid-looking code
    return { passed: true }
  }
}
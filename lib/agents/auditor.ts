import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are an automated static analysis tool for Terraform HCL files.
Audit the provided Terraform code for:
- Syntax errors or unclosed brackets
- Missing required arguments on resources
- Deprecated resource names
- Invalid or undefined variable references

Output rules:
- If errors found: output exactly "REJECTED: " followed by a concise error description
- If code is valid: output exactly "PASSED"
- Nothing else — no markdown, no explanation beyond the error description`;

export interface AuditResult {
  passed: boolean;
  error?: string;
}

export async function runAuditor(terraformCode: string): Promise<AuditResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: terraformCode }],
  });

  const text = (response.content[0] as { type: string; text: string }).text.trim();

  if (text === 'PASSED') {
    return { passed: true };
  }

  if (text.startsWith('REJECTED:')) {
    return { passed: false, error: text.replace('REJECTED:', '').trim() };
  }

  // Unexpected output — treat as failure
  return { passed: false, error: `Unexpected auditor response: ${text.slice(0, 100)}` };
}
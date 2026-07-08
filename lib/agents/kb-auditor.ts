import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
const client = new Anthropic({ apiKey: config.anthropic.api_key });

const SYSTEM_PROMPT = `You are a security gatekeeper for an Enterprise Cloud Infrastructure SaaS platform's
Knowledge Base. Every Terraform template uploaded here is later used by AI agents as a trusted baseline
pattern for every future customer blueprint — so a single insecure template can silently replicate that
vulnerability across an entire organisation's infrastructure.

Scan the provided Terraform code for CRITICAL security issues only. Flag ONLY:
- Hardcoded plaintext secrets, passwords, API keys, or access tokens
- Databases or storage explicitly configured as publicly accessible (e.g. publicly_accessible = true,
  0.0.0.0/0 ingress on database/admin ports, public S3/storage ACLs)
- IAM policies with wildcard Action "*" AND wildcard Resource "*" together
- Encryption explicitly disabled on a resource that supports it (e.g. encrypted = false)

Do NOT flag: missing-but-not-disabled settings, style preferences, deprecated instance types, missing tags,
or anything that is merely a best-practice suggestion rather than an active critical exposure. This is a
baseline-template gate, not a full audit — only block for genuine critical risk.

Output ONLY valid JSON, no other text, no markdown fences:
{
  "blocked": true or false,
  "issues": [
    { "resource": "<resource name/type from the code>", "issue": "<one sentence description>" }
  ]
}
If there are no critical issues, output { "blocked": false, "issues": [] }.`;

export interface KBAuditResult {
  blocked: boolean;
  issues: { resource: string; issue: string }[];
}

export async function runKBAuditor(terraformContent: string): Promise<KBAuditResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: terraformContent.slice(0, 15000) }],
  });

  const text = (response.content[0] as { type: string; text: string }).text.trim();

  try {
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      blocked: !!parsed.blocked,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    // If the model didn't return valid JSON, fail safe (don't block on a parse error).
    return { blocked: false, issues: [] };
  }
}

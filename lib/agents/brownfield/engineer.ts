import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ScanResult } from './scanner'
import { MigrationPlan } from './planner'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

function getSystemPrompt(targetCloud: string): string {
  const rules: Record<string, string> = {
    aws: `Use hashicorp/aws provider ~> 5.0. Use terraform-aws-modules. Fix all security issues from audit. Use t3/m5 instances. Enable encryption everywhere. No public databases.`,
    azure: `Use hashicorp/azurerm provider ~> 3.0. Always include features {}. Create resource group first. Fix all security issues. Use private endpoints for databases.`,
    gcp: `Use hashicorp/google provider ~> 5.0. Fix all security issues. Use private IPs for Cloud SQL. Enable deletion_protection on databases.`,
  }
  return `You are a Senior DevOps Engineer. Generate modernised production-ready Terraform HCL for the target cloud.

TARGET CLOUD RULES:
${rules[targetCloud] || rules.aws}

GENERAL RULES:
1. Fix ALL security issues identified in the audit
2. Use approved modern instance types only
3. Enable encryption on all storage and databases
4. No publicly accessible databases
5. Apply tags/labels on all resources
6. Output ONLY raw Terraform HCL — no markdown, no explanation
7. Maximum 150 lines`
}

export async function runBrownfieldEngineer(
  scanResult: ScanResult,
  migrationPlan: MigrationPlan,
  kbContext?: string
): Promise<string> {
  const contextSection = kbContext
    ? `\n\nORGANISATION STANDARDS — follow these:\n${kbContext.slice(0, 1500)}`
    : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: getSystemPrompt(migrationPlan.target_cloud),
    messages: [{
      role: 'user',
      content: `Generate modernised Terraform for this migration.\nOriginal infrastructure: ${JSON.stringify(scanResult, null, 2)}\nMigration plan: ${JSON.stringify(migrationPlan, null, 2)}${contextSection}`
    }],
  })

  return (response.content[0] as { type: string; text: string }).text.trim()
}

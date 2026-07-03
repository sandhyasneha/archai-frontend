import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ArchPlan } from '@/types'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

function getSystemPrompt(provider: string): string {
  const providerRules: Record<string, string> = {
    aws: `Use the official AWS Terraform provider (hashicorp/aws version ~> 5.0).
Use terraform-aws-modules where available (vpc, rds, ecs, alb, s3-bucket).
All resources use "aws_" prefix.
Region: use variable or locals block defaulting to us-east-1.`,

    azure: `Use the official Azure Terraform provider (hashicorp/azurerm version ~> 3.0).
Always include a provider block with features {}.
Always create an azurerm_resource_group first — all resources reference it.
All resources use "azurerm_" prefix.
Use azurerm_kubernetes_cluster for containers, azurerm_postgresql_flexible_server for databases.
Region: use locals block defaulting to East US.`,

    gcp: `Use the official Google Terraform provider (hashicorp/google version ~> 5.0).
Always include project and region in the provider block.
All resources use "google_" prefix.
Use google_container_cluster for GKE, google_sql_database_instance for Cloud SQL.
Use google_compute_network and google_compute_subnetwork for networking.
Region: use locals block defaulting to us-central1.`,
  }

  return `You are a Senior DevOps Engineer specialising in HashiCorp Terraform.
Given a JSON architecture plan, generate complete production-ready Terraform HCL code.

PROVIDER RULES:
${providerRules[provider] || providerRules.aws}

GENERAL RULES:
1. Every block must be syntactically complete with matching braces.
2. Output ONLY raw Terraform HCL — no markdown fences, no explanations.
3. Keep code concise — maximum 120 lines.
4. Include locals block with common tags/labels.
5. All resources must have tags or labels.`
}

export async function runEngineer(
  plan: ArchPlan,
  kbContext?: string,
  previousError?: string
): Promise<string> {
  const contextSection = kbContext
    ? `\n\nORGANISATION STANDARDS — follow these exactly:\n${kbContext.slice(0, 2000)}`
    : ''

  const messages: Anthropic.MessageParam[] = []
  const provider = plan.provider || 'aws'

  if (previousError) {
    messages.push({
      role: 'user',
      content: `Architecture plan: ${JSON.stringify(plan, null, 2)}${contextSection}\n\nPrevious attempt REJECTED: ${previousError}\n\nFix and regenerate complete Terraform code.`,
    })
  } else {
    messages.push({
      role: 'user',
      content: `Generate Terraform code for this ${provider.toUpperCase()} architecture plan:\n${JSON.stringify(plan, null, 2)}${contextSection}`,
    })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: getSystemPrompt(provider),
    messages,
  })

  return (response.content[0] as { type: string; text: string }).text.trim()
}
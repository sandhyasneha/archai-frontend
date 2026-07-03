import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ArchPlan } from '@/types'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

function getSystemPrompt(provider: string): string {
  const examples: Record<string, string> = {
    aws: `{"provider":"aws","region":"us-east-1","resources":[{"type":"vpc","purpose":"isolated network with subnets"},{"type":"ecs_cluster","purpose":"run containerised services"},{"type":"rds_postgres","purpose":"managed relational database"},{"type":"alb","purpose":"application load balancer"}]}`,
    azure: `{"provider":"azure","region":"eastus","resources":[{"type":"resource_group","purpose":"logical container for all resources"},{"type":"virtual_network","purpose":"isolated network with subnets"},{"type":"aks_cluster","purpose":"managed Kubernetes for containers"},{"type":"postgresql_flexible_server","purpose":"managed PostgreSQL database"},{"type":"application_gateway","purpose":"layer 7 load balancer"}]}`,
    gcp: `{"provider":"gcp","region":"us-central1","resources":[{"type":"vpc_network","purpose":"isolated network with subnets"},{"type":"gke_cluster","purpose":"managed Kubernetes for containers"},{"type":"cloud_sql_postgres","purpose":"managed PostgreSQL database"},{"type":"cloud_load_balancing","purpose":"global load balancer"},{"type":"cloud_storage","purpose":"object storage bucket"}]}`,
  }

  return `You are a cloud architect. Output ONLY a JSON object. Maximum 5 resources. Each purpose under 6 words. No markdown or explanation.
Provider must be exactly: ${provider}
Example output for ${provider}:
${examples[provider] || examples.aws}`
}

const DEFAULT_PLANS: Record<string, ArchPlan> = {
  aws: {
    provider: 'aws',
    region: 'us-east-1',
    resources: [
      { type: 'vpc', purpose: 'isolated network with subnets' },
      { type: 'ecs_cluster', purpose: 'run containerised services' },
      { type: 'rds_postgres', purpose: 'managed relational database' },
      { type: 'alb', purpose: 'application load balancer' },
    ],
  },
  azure: {
    provider: 'azure',
    region: 'eastus',
    resources: [
      { type: 'resource_group', purpose: 'logical container for resources' },
      { type: 'virtual_network', purpose: 'isolated network with subnets' },
      { type: 'aks_cluster', purpose: 'managed Kubernetes cluster' },
      { type: 'postgresql_flexible_server', purpose: 'managed PostgreSQL database' },
      { type: 'application_gateway', purpose: 'layer 7 load balancer' },
    ],
  },
  gcp: {
    provider: 'gcp',
    region: 'us-central1',
    resources: [
      { type: 'vpc_network', purpose: 'isolated network with subnets' },
      { type: 'gke_cluster', purpose: 'managed Kubernetes cluster' },
      { type: 'cloud_sql_postgres', purpose: 'managed PostgreSQL database' },
      { type: 'cloud_load_balancing', purpose: 'global load balancer' },
      { type: 'cloud_storage', purpose: 'object storage bucket' },
    ],
  },
}

function fixJson(str: string): string {
  const ob = (str.match(/\{/g) || []).length
  const cb = (str.match(/\}/g) || []).length
  const oq = (str.match(/\[/g) || []).length
  const cq = (str.match(/\]/g) || []).length
  let out = str
  for (let i = 0; i < oq - cq; i++) out += ']'
  for (let i = 0; i < ob - cb; i++) out += '}'
  return out
}

export async function runArchitect(
  prompt: string,
  kbContext?: string,
  cloudProvider: string = 'aws'
): Promise<ArchPlan> {
  const contextSection = kbContext
    ? `\n\nORGANISATION STANDARDS (follow these exactly):\n${kbContext.slice(0, 1500)}`
    : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: getSystemPrompt(cloudProvider),
    messages: [{ role: 'user', content: `${prompt.slice(0, 300)}${contextSection}` }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return DEFAULT_PLANS[cloudProvider] || DEFAULT_PLANS.aws

  const end = cleaned.lastIndexOf('}')
  const jsonStr = end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start)

  try {
    const parsed = JSON.parse(jsonStr) as ArchPlan
    parsed.provider = cloudProvider
    if (parsed.resources && parsed.resources.length > 5) {
      parsed.resources = parsed.resources.slice(0, 5)
    }
    return parsed
  } catch {
    try {
      const parsed = JSON.parse(fixJson(jsonStr)) as ArchPlan
      parsed.provider = cloudProvider
      if (parsed.resources && parsed.resources.length > 5) {
        parsed.resources = parsed.resources.slice(0, 5)
      }
      return parsed
    } catch {
      return DEFAULT_PLANS[cloudProvider] || DEFAULT_PLANS.aws
    }
  }
}
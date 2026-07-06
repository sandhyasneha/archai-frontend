import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ScanResult } from './scanner'
import { AuditResult } from './auditor'
const client = new Anthropic({ apiKey: config.anthropic.api_key })

export interface MigrationStep {
  phase: number
  title: string
  description: string
  resources_affected: string[]
  risk: 'low' | 'medium' | 'high'
  estimated_hours: number
}

export interface MigrationPlan {
  strategy: string
  target_cloud: string
  target_region: string
  phases: MigrationStep[]
  total_phases: number
  estimated_days: number
  cost_before_usd: number
  cost_after_usd: number
  cost_saving_usd: number
  cost_saving_pct: number
}

const SYSTEM_PROMPT = `You are a cloud migration planner. Create a detailed migration plan based on the infrastructure scan and audit findings.

Output ONLY a JSON object:
{
  "strategy": "Lift-and-shift with modernisation",
  "target_cloud": "aws",
  "target_region": "us-east-1",
  "phases": [
    {
      "phase": 1,
      "title": "Security hardening",
      "description": "Fix all critical and high security findings before migration",
      "resources_affected": ["aws_db_instance", "aws_s3_bucket"],
      "risk": "low",
      "estimated_hours": 4
    }
  ],
  "total_phases": 3,
  "estimated_days": 5,
  "cost_before_usd": 450,
  "cost_after_usd": 285,
  "cost_saving_usd": 165,
  "cost_saving_pct": 37
}

No markdown, no explanation.`

export async function runPlanner(
  scanResult: ScanResult,
  auditResult: AuditResult,
  targetCloud: string,
  kbContext?: string
): Promise<MigrationPlan> {
  const contextSection = kbContext
    ? `\n\nORGANISATION STANDARDS:\n${kbContext.slice(0, 1000)}`
    : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Create migration plan.\nTarget cloud: ${targetCloud}\nScan: ${JSON.stringify(scanResult, null, 2)}\nAudit: ${JSON.stringify(auditResult, null, 2)}${contextSection}`
    }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return getDefaultPlan(targetCloud)

  try {
    return JSON.parse(cleaned.slice(start)) as MigrationPlan
  } catch {
    return getDefaultPlan(targetCloud)
  }
}

function getDefaultPlan(targetCloud: string): MigrationPlan {
  return {
    strategy: 'Lift-and-shift with modernisation',
    target_cloud: targetCloud,
    target_region: targetCloud === 'azure' ? 'eastus' : targetCloud === 'gcp' ? 'us-central1' : 'us-east-1',
    phases: [
      { phase: 1, title: 'Security hardening', description: 'Fix critical security findings', resources_affected: ['database', 'storage'], risk: 'low', estimated_hours: 4 },
      { phase: 2, title: 'Infrastructure modernisation', description: 'Upgrade deprecated resources', resources_affected: ['compute'], risk: 'medium', estimated_hours: 8 },
      { phase: 3, title: 'Migration and validation', description: 'Deploy new infrastructure and validate', resources_affected: ['all'], risk: 'medium', estimated_hours: 12 },
    ],
    total_phases: 3,
    estimated_days: 5,
    cost_before_usd: 450,
    cost_after_usd: 285,
    cost_saving_usd: 165,
    cost_saving_pct: 37,
  }
}

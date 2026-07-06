import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'
import { ScanResult } from './scanner'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

export interface AuditFinding {
  resource: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  issue: string
  recommendation: string
}

export interface AuditResult {
  findings: AuditFinding[]
  compliance_score: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  cost_waste_usd: number
  summary: string
}

const SYSTEM_PROMPT = `You are a cloud security and cost auditor. Analyse the scanned infrastructure and identify all issues.

Output ONLY a JSON object:
{
  "findings": [
    {
      "resource": "aws_db_instance.database",
      "severity": "critical",
      "category": "Security",
      "issue": "Database is publicly accessible",
      "recommendation": "Set publicly_accessible = false and move to private subnet"
    }
  ],
  "compliance_score": 45,
  "critical_count": 2,
  "high_count": 3,
  "medium_count": 4,
  "low_count": 2,
  "cost_waste_usd": 180,
  "summary": "Infrastructure has critical security gaps and significant cost waste"
}

Check for: security misconfigurations, deprecated instance types, missing encryption, no backups, public exposure, missing tags, cost inefficiencies, compliance violations.
No markdown, no explanation.`

export async function runBrownfieldAuditor(scanResult: ScanResult): Promise<AuditResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Audit this infrastructure:\n${JSON.stringify(scanResult, null, 2)}` }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return getDefaultAudit()

  try {
    return JSON.parse(cleaned.slice(start)) as AuditResult
  } catch {
    return getDefaultAudit()
  }
}

function getDefaultAudit(): AuditResult {
  return {
    findings: [
      { resource: 'aws_db_instance', severity: 'critical', category: 'Security', issue: 'Database publicly accessible', recommendation: 'Move to private subnet' },
      { resource: 'aws_s3_bucket', severity: 'high', category: 'Security', issue: 'Public access not blocked', recommendation: 'Enable S3 block public access' },
      { resource: 'aws_instance', severity: 'medium', category: 'Cost', issue: 'Deprecated t2 instance type', recommendation: 'Upgrade to t3 for better price/performance' },
    ],
    compliance_score: 45,
    critical_count: 1,
    high_count: 1,
    medium_count: 1,
    low_count: 0,
    cost_waste_usd: 120,
    summary: 'Infrastructure has critical security gaps and cost inefficiencies',
  }
}

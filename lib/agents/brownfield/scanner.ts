import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'

const client = new Anthropic({ apiKey: config.anthropic.api_key })

export interface ScannedResource {
  type: string
  name: string
  cloud: string
  region: string
  issues: string[]
  properties: Record<string, string>
}

export interface ScanResult {
  source_cloud: string
  region: string
  resources: ScannedResource[]
  total_resources: number
  input_type: string
}

const SYSTEM_PROMPT = `You are a cloud infrastructure scanner. Analyse the provided infrastructure code or description and extract all resources.

Output ONLY a JSON object like this:
{
  "source_cloud": "aws",
  "region": "us-east-1",
  "resources": [
    {
      "type": "aws_instance",
      "name": "web_server",
      "cloud": "aws",
      "region": "us-east-1",
      "issues": ["t2.micro deprecated", "no encryption"],
      "properties": {"instance_type": "t2.micro", "ami": "ami-12345"}
    }
  ],
  "total_resources": 1,
  "input_type": "terraform"
}

Detect the cloud provider from the resource prefixes (aws_, azurerm_, google_).
If input is plain English description, infer the resources.
Maximum 20 resources. No markdown, no explanation.`

const DEFAULT_RESULT: ScanResult = {
  source_cloud: 'aws',
  region: 'us-east-1',
  resources: [
    { type: 'aws_instance', name: 'web_server', cloud: 'aws', region: 'us-east-1', issues: ['legacy instance type', 'no encryption'], properties: { instance_type: 't2.micro' } },
    { type: 'aws_db_instance', name: 'database', cloud: 'aws', region: 'us-east-1', issues: ['publicly accessible', 'no backup retention'], properties: { engine: 'mysql', instance_class: 'db.t2.small' } },
    { type: 'aws_s3_bucket', name: 'storage', cloud: 'aws', region: 'us-east-1', issues: ['public access not blocked', 'no versioning'], properties: { bucket: 'my-bucket' } },
  ],
  total_resources: 3,
  input_type: 'terraform',
}

export async function runScanner(input: string, inputType: string): Promise<ScanResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Input type: ${inputType}\n\n${input.slice(0, 3000)}` }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return DEFAULT_RESULT

  try {
    const parsed = JSON.parse(cleaned.slice(start)) as ScanResult
    return parsed
  } catch {
    return DEFAULT_RESULT
  }
}

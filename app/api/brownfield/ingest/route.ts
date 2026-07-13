import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { hashApiKey } from '@/lib/api-keys'
import { runBrownfieldAuditor } from '@/lib/agents/brownfield/auditor'
import { runPlanner } from '@/lib/agents/brownfield/planner'
import { runBrownfieldEngineer } from '@/lib/agents/brownfield/engineer'
import { generateADR } from '@/lib/agents/brownfield/adr'
import { ScanResult } from '@/lib/agents/brownfield/scanner'
import { z } from 'zod'

const ScannedResourceSchema = z.object({
  type: z.string(),
  name: z.string(),
  cloud: z.string(),
  region: z.string(),
  issues: z.array(z.string()),
  properties: z.record(z.string(), z.string()),
})

const Schema = z.object({
  target_cloud: z.enum(['aws', 'azure', 'gcp']),
  scan_result: z.object({
    source_cloud: z.string(),
    region: z.string(),
    resources: z.array(ScannedResourceSchema),
    total_resources: z.number(),
    input_type: z.literal('auto_discover'),
  }),
})

async function resolveUserFromApiKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const key = authHeader.slice('Bearer '.length).trim()
  const keyHash = hashApiKey(key)

  const { data } = await serviceClient
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!data) return null

  await serviceClient
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return data.user_id as string
}

export async function POST(req: NextRequest) {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const userId = await resolveUserFromApiKey(serviceClient, req.headers.get('authorization'))
  if (!userId) {
    return Response.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  // Same Team+ plan gate as the pasted-input Brownfield flow.
  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  const plan = subscription?.plans as { name: string } | null
  if (!plan || !['team', 'enterprise'].includes(plan.name)) {
    return Response.json({
      error: 'plan_required',
      message: 'Brownfield analysis requires Team or Enterprise plan. Upgrade to continue.',
    }, { status: 403 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { target_cloud, scan_result } = parsed.data
  const scanResult = scan_result as ScanResult

  if (scanResult.total_resources === 0) {
    return Response.json({
      error: 'no_resources_found',
      message: `No resources were found in ${scanResult.region}. This usually means either the account is genuinely empty, or the scanning credentials don't have permission to list resources there.`,
      hint: 'Confirm real resources exist in this account/region and that your local credentials have the required read permissions, then try again.',
    }, { status: 422 })
  }

  // Fetch KB context, same as the pasted-input flow.
  let kbContext = ''
  try {
    const { data: kbFiles } = await serviceClient.storage.from('knowledge-base').list(`${userId}/`)
    if (kbFiles && kbFiles.length > 0) {
      const fileContents = await Promise.all(
        kbFiles.slice(0, 3).map(async (file) => {
          const { data } = await serviceClient.storage.from('knowledge-base').download(`${userId}/${file.name}`)
          if (data) {
            const text = await data.text()
            return `=== ${file.name} ===\n${text.slice(0, 1000)}`
          }
          return ''
        })
      )
      kbContext = fileContents.filter(Boolean).join('\n\n')
    }
  } catch { kbContext = '' }

  try {
    // Scanner step is skipped entirely — the CLI already produced
    // structured resource data from real cloud APIs.
    const auditResult = await runBrownfieldAuditor(scanResult)
    const migrationPlan = await runPlanner(scanResult, auditResult, target_cloud, kbContext)
    const terraformOutput = await runBrownfieldEngineer(scanResult, migrationPlan, kbContext)

    const { data: scan, error: insertError } = await serviceClient
      .from('brownfield_scans')
      .insert({
        user_id: userId,
        input_type: 'auto_discover',
        input_content: `CLI auto-discover: ${scanResult.total_resources} resources from ${scanResult.source_cloud}`,
        source_cloud: scanResult.source_cloud,
        target_cloud,
        audit_findings: {
          findings: auditResult.findings,
          compliance_score: auditResult.compliance_score,
          critical_count: auditResult.critical_count,
          high_count: auditResult.high_count,
          medium_count: auditResult.medium_count,
          low_count: auditResult.low_count,
          cost_waste_usd: auditResult.cost_waste_usd,
          summary: auditResult.summary,
          scan_summary: {
            total_resources: scanResult.total_resources,
            source_cloud: scanResult.source_cloud,
            region: scanResult.region,
            resources: scanResult.resources,
          },
        },
        migration_plan: migrationPlan,
        terraform_output: terraformOutput,
        cost_before: migrationPlan.cost_before_usd,
        cost_after: migrationPlan.cost_after_usd,
        status: 'complete',
      })
      .select()
      .single()

    if (insertError) {
      console.error('brownfield_scans insert failed (ingest):', insertError)
      return Response.json({ error: 'Failed to save scan' }, { status: 500 })
    }

    let adrId: string | null = null
    if (scan?.id) {
      adrId = `ADR-${scan.id.slice(0, 8).toUpperCase()}`
      const adrMarkdown = generateADR(adrId, scanResult, auditResult, migrationPlan)
      await serviceClient
        .from('brownfield_scans')
        .update({ migration_plan: { ...migrationPlan, adr_id: adrId, adr_markdown: adrMarkdown } })
        .eq('id', scan.id)
    }

    return Response.json({
      scan_id: scan?.id,
      adr_id: adrId,
      compliance_score: auditResult.compliance_score,
      findings_count: auditResult.findings.length,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/brownfield/${scan?.id}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Ingest pipeline failed:', message)
    return Response.json({ error: 'Analysis failed', message }, { status: 500 })
  }
}

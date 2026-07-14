import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { assumeCustomerRole } from '@/lib/aws-connect/sts'
import { scanAWSWithAssumedRole, buildScanResult } from '@/lib/aws-connect/scanner'
import { runBrownfieldAuditor } from '@/lib/agents/brownfield/auditor'
import { runPlanner } from '@/lib/agents/brownfield/planner'
import { runBrownfieldEngineer } from '@/lib/agents/brownfield/engineer'
import { generateADR } from '@/lib/agents/brownfield/adr'
import { z } from 'zod'

const Schema = z.object({
  connection_id: z.string().uuid(),
  target_cloud: z.enum(['aws', 'azure', 'gcp']),
  migration_name: z.string().trim().min(1).max(200).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', user.id)
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
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { connection_id, target_cloud, migration_name } = parsed.data

  const { data: connection } = await supabase
    .from('aws_connections')
    .select('*')
    .eq('id', connection_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!connection || !connection.role_arn) {
    return Response.json({ error: 'No active AWS connection found. Connect an account first.' }, { status: 404 })
  }

  try {
    const creds = await assumeCustomerRole(connection.role_arn, connection.external_id)
    const { resources, warnings } = await scanAWSWithAssumedRole(connection.region, creds)
    const scanResult = buildScanResult(connection.region, resources)

    if (scanResult.total_resources === 0) {
      return Response.json({
        error: 'no_resources_found',
        message: `No resources were found in ${connection.region}. This usually means either the account is genuinely empty, or the connected role doesn't have permission to list resources in this region.${warnings.length > 0 ? ' Details: ' + warnings.join('; ') : ''}`,
        hint: 'Confirm real resources exist in this region/account, and that the Reader permissions cover them, then try again.',
      }, { status: 422 })
    }

    if (warnings.length > 0) {
      console.error('AWS connect scan warnings:', warnings)
    }

    let kbContext = ''
    try {
      const { data: kbFiles } = await serviceClient.storage.from('knowledge-base').list(`${user.id}/`)
      if (kbFiles && kbFiles.length > 0) {
        const fileContents = await Promise.all(
          kbFiles.slice(0, 3).map(async (file) => {
            const { data } = await serviceClient.storage.from('knowledge-base').download(`${user.id}/${file.name}`)
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

    const auditResult = await runBrownfieldAuditor(scanResult)
    const migrationPlan = await runPlanner(scanResult, auditResult, target_cloud, kbContext)
    const terraformOutput = await runBrownfieldEngineer(scanResult, migrationPlan, kbContext)

    const { data: scan, error: insertError } = await serviceClient
      .from('brownfield_scans')
      .insert({
        user_id: user.id,
        input_type: 'auto_discover',
        input_content: `Live AWS connection scan: ${scanResult.total_resources} resources from ${connection.region}`,
        source_cloud: 'aws',
        target_cloud,
        migration_name: migration_name ?? null,
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
      console.error('brownfield_scans insert failed (aws-connect):', insertError)
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

    await supabase
      .from('aws_connections')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', connection_id)

    return Response.json({
      scan_id: scan?.id,
      adr_id: adrId,
      compliance_score: auditResult.compliance_score,
      findings_count: auditResult.findings.length,
      warnings,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/brownfield/${scan?.id}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('AWS connect scan failed:', message)
    return Response.json({ error: 'Scan failed', message }, { status: 500 })
  }
}

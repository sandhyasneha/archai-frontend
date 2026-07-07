import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { runScanner } from '@/lib/agents/brownfield/scanner'
import { runBrownfieldAuditor } from '@/lib/agents/brownfield/auditor'
import { runPlanner } from '@/lib/agents/brownfield/planner'
import { runBrownfieldEngineer } from '@/lib/agents/brownfield/engineer'
import { z } from 'zod'

const Schema = z.object({
  input_content: z.string().min(10).max(10000),
  input_type: z.enum(['terraform', 'tfstate', 'description']),
  target_cloud: z.enum(['aws', 'azure', 'gcp']),
})

function encode(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorised', { status: 401 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check Team+ plan
  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const plan = subscription?.plans as { name: string } | null
  if (!plan || !['team', 'enterprise'].includes(plan.name)) {
    return new Response(JSON.stringify({
      error: 'plan_required',
      message: 'Brownfield analysis requires Team or Enterprise plan. Upgrade to continue.',
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return new Response('Invalid input', { status: 400 })

  const input = parsed.data

  // Fetch KB context
  let kbContext = ''
  try {
    const { data: kbFiles } = await supabase.storage.from('knowledge-base').list(`${user.id}/`)
    if (kbFiles && kbFiles.length > 0) {
      const fileContents = await Promise.all(
        kbFiles.slice(0, 3).map(async (file) => {
          const { data } = await supabase.storage.from('knowledge-base').download(`${user.id}/${file.name}`)
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

  const now = () => new Date().toISOString()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Scanner
        controller.enqueue(encode({ step: 'scanner', status: 'started', message: 'Scanning existing infrastructure...', timestamp: now() }))
        const scanResult = await runScanner(input.input_content, input.input_type)
        controller.enqueue(encode({ step: 'scanner', status: 'completed', message: `Scan complete — ${scanResult.total_resources} resources found on ${scanResult.source_cloud.toUpperCase()}.`, payload: scanResult, timestamp: now() }))

        // Step 2: Auditor
        controller.enqueue(encode({ step: 'auditor', status: 'started', message: 'Auditing security, compliance, and cost...', timestamp: now() }))
        const auditResult = await runBrownfieldAuditor(scanResult)
        controller.enqueue(encode({ step: 'auditor', status: 'completed', message: `Audit complete — ${auditResult.findings.length} findings, compliance score: ${auditResult.compliance_score}/100.`, payload: auditResult, timestamp: now() }))

        // Step 3: Planner
        controller.enqueue(encode({ step: 'planner', status: 'started', message: 'Creating migration plan...', timestamp: now() }))
        const migrationPlan = await runPlanner(scanResult, auditResult, input.target_cloud, kbContext)
        controller.enqueue(encode({ step: 'planner', status: 'completed', message: `Plan complete — ${migrationPlan.total_phases} phases, ${migrationPlan.estimated_days} days estimated.`, payload: migrationPlan, timestamp: now() }))

        // Step 4: Engineer
        controller.enqueue(encode({ step: 'engineer', status: 'started', message: 'Generating modernised Terraform...', timestamp: now() }))
        const terraformOutput = await runBrownfieldEngineer(scanResult, migrationPlan, kbContext)
        controller.enqueue(encode({ step: 'engineer', status: 'completed', message: 'Terraform generated successfully.', timestamp: now() }))

        // Save to Supabase
        const { data: scan, error: insertError } = await serviceClient
          .from('brownfield_scans')
          .insert({
            user_id: user.id,
            input_type: input.input_type,
            input_content: input.input_content.slice(0, 5000),
            source_cloud: scanResult.source_cloud,
            target_cloud: input.target_cloud,
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
          console.error('brownfield_scans insert failed:', insertError)
        }

        controller.enqueue(encode({
          step: 'complete',
          status: 'completed',
          message: 'Analysis complete. Migration blueprint ready.',
          payload: {
            scan_id: scan?.id,
            scan_result: scanResult,
            audit_result: auditResult,
            migration_plan: migrationPlan,
            terraform_output: terraformOutput,
          },
          timestamp: now(),
        }))

        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encode({ step: 'scanner', status: 'error', message: `Analysis failed: ${message}`, timestamp: now() }))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

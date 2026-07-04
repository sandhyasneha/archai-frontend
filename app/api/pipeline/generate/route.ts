import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { runGatekeeper } from '@/lib/agents/gatekeeper'
import { runArchitect } from '@/lib/agents/architect'
import { runEngineer } from '@/lib/agents/engineer'
import { runAuditor } from '@/lib/agents/auditor'
import { z } from 'zod'

const MAX_RETRIES = 3
const COST_PER_INPUT_TOKEN = 0.000003
const COST_PER_OUTPUT_TOKEN = 0.000015

const Schema = z.object({
  prompt: z.string().min(10).max(2000),
  cloud_provider: z.enum(['aws', 'azure', 'gcp']),
  project_name: z.string().optional(),
  project_id: z.string().uuid().optional(),
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

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return new Response('Invalid input', { status: 400 })

  const input = parsed.data

  // PLAN ENFORCEMENT
  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (subscription) {
    const plan = subscription.plans as {
      name: string
      blueprint_limit: number
      clouds: string[]
    }
    if (plan.blueprint_limit !== -1 && subscription.blueprints_used >= plan.blueprint_limit) {
      return new Response(JSON.stringify({
        error: 'limit_exceeded',
        message: `You have reached your ${plan.name} plan limit of ${plan.blueprint_limit} blueprints/month. Please upgrade to continue.`,
        upgrade_required: true,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    if (plan.name === 'scout' && input.cloud_provider !== 'aws') {
      return new Response(JSON.stringify({
        error: 'cloud_not_allowed',
        message: 'Your Scout plan only supports AWS. Upgrade to Pro for Azure and GCP access.',
        upgrade_required: true,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // FETCH KB CONTEXT
  let kbContext = ''
  try {
    const { data: kbFiles } = await supabase.storage
      .from('knowledge-base')
      .list(`${user.id}/`)
    if (kbFiles && kbFiles.length > 0) {
      const fileContents = await Promise.all(
        kbFiles.slice(0, 5).map(async (file) => {
          const { data } = await supabase.storage
            .from('knowledge-base')
            .download(`${user.id}/${file.name}`)
          if (data) {
            const text = await data.text()
            return `=== ${file.name} ===\n${text.slice(0, 2000)}`
          }
          return ''
        })
      )
      kbContext = fileContents.filter(Boolean).join('\n\n')
    }
  } catch {
    kbContext = ''
  }

  const now = () => new Date().toISOString()
  let totalTokensIn = 0
  let totalTokensOut = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Agent 0: Gatekeeper
        controller.enqueue(encode({ agent: 'gatekeeper', status: 'started', message: 'Validating prompt...', timestamp: now() }))
        const isValid = await runGatekeeper(input.prompt)
        totalTokensIn += 50
        totalTokensOut += 5

        if (!isValid) {
          controller.enqueue(encode({ agent: 'gatekeeper', status: 'rejected', message: 'Prompt is not related to cloud infrastructure.', timestamp: now() }))
          controller.close()
          return
        }
        controller.enqueue(encode({ agent: 'gatekeeper', status: 'completed', message: 'Prompt validated — cloud infrastructure request confirmed.', timestamp: now() }))

        // Agent 1: Architect
        controller.enqueue(encode({ agent: 'architect', status: 'started', message: 'Building resource dependency plan...', timestamp: now() }))
        const archPlan = await runArchitect(input.prompt, kbContext, input.cloud_provider)
        totalTokensIn += Math.ceil((input.prompt.length + kbContext.length) / 4) + 200
        totalTokensOut += 200
        controller.enqueue(encode({ agent: 'architect', status: 'completed', message: `Plan complete — ${archPlan.resources.length} resources on ${archPlan.provider.toUpperCase()}.`, payload: archPlan, timestamp: now() }))

        // Agent 2+3: Engineer + Auditor
        let terraformCode = ''
        let lastError: string | undefined
        let passed = false

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          controller.enqueue(encode({ agent: 'engineer', status: 'started', message: attempt === 1 ? 'Generating Terraform HCL...' : `Retry ${attempt}/${MAX_RETRIES}...`, timestamp: now() }))
          terraformCode = await runEngineer(archPlan, kbContext, lastError)
          totalTokensIn += Math.ceil(JSON.stringify(archPlan).length / 4) + Math.ceil(kbContext.length / 4) + 300
          totalTokensOut += Math.ceil(terraformCode.length / 4)
          controller.enqueue(encode({ agent: 'engineer', status: 'completed', message: 'Terraform code generated.', timestamp: now() }))

          controller.enqueue(encode({ agent: 'auditor', status: 'started', message: 'Running syntax and security audit...', timestamp: now() }))
          const audit = await runAuditor(terraformCode)
          totalTokensIn += Math.ceil(terraformCode.length / 4)
          totalTokensOut += 10

          if (audit.passed) {
            passed = true
            controller.enqueue(encode({ agent: 'auditor', status: 'completed', message: 'PASSED — all checks clear.', timestamp: now() }))
            break
          } else {
            lastError = audit.error
            controller.enqueue(encode({ agent: 'auditor', status: 'rejected', message: `REJECTED (attempt ${attempt}/${MAX_RETRIES}): ${audit.error}`, timestamp: now() }))
            if (attempt === MAX_RETRIES) {
              controller.enqueue(encode({ agent: 'auditor', status: 'error', message: 'Max retries reached. Please refine your prompt.', timestamp: now() }))
              controller.close()
              return
            }
          }
        }

        if (!passed) { controller.close(); return }

        // Create project
        let projectId: string | null = null
        if (input.project_name) {
          const { data: project } = await serviceClient
            .from('projects')
            .insert({
              user_id: user.id,
              org_id: null,
              name: input.project_name,
              type: 'greenfield',
              cloud_provider: input.cloud_provider,
              status: 'complete',
              current_step: 5,
            })
            .select()
            .single()
          projectId = project?.id ?? null
        }

        // Save blueprint
        const { data: blueprint } = await serviceClient
          .from('blueprints')
          .insert({
            user_id: user.id,
            project_id: projectId,
            prompt: input.prompt,
            arch_plan: archPlan,
            terraform_code: terraformCode,
            audit_result: 'PASSED',
          })
          .select()
          .single()

        // Log token usage
        const totalCost = (totalTokensIn * COST_PER_INPUT_TOKEN) + (totalTokensOut * COST_PER_OUTPUT_TOKEN)
        await serviceClient.from('usage_logs').insert({
          user_id: user.id,
          blueprint_id: blueprint?.id ?? null,
          agent: 'pipeline',
          tokens_in: totalTokensIn,
          tokens_out: totalTokensOut,
          cost_usd: totalCost,
        })

        // Update blueprint usage counter
        if (subscription) {
          await serviceClient
            .from('subscriptions')
            .update({ blueprints_used: subscription.blueprints_used + 1 })
            .eq('user_id', user.id)
        }

        controller.enqueue(encode({
          agent: 'auditor',
          status: 'completed',
          message: 'Blueprint saved.',
          payload: {
            blueprint_id: blueprint?.id,
            terraform_code: terraformCode,
            arch_plan: archPlan,
          },
          timestamp: now(),
        }))

        controller.close()

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encode({ agent: 'gatekeeper', status: 'error', message: `Pipeline error: ${message}`, timestamp: now() }))
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

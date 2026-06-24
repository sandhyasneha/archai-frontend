import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runGatekeeper } from '@/lib/agents/gatekeeper'
import { runArchitect } from '@/lib/agents/architect'
import { runEngineer } from '@/lib/agents/engineer'
import { runAuditor } from '@/lib/agents/auditor'
import { z } from 'zod'

const MAX_RETRIES = 3

const Schema = z.object({
  prompt: z.string().min(10).max(2000),
  cloud_provider: z.enum(['aws', 'azure', 'gcp']),
  project_id: z.string().uuid().optional(),
})

function encode(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorised', { status: 401 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return new Response('Invalid input', { status: 400 })
  }

  const input = parsed.data
  const now = () => new Date().toISOString()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Agent 0: Gatekeeper
        controller.enqueue(encode({ agent: 'gatekeeper', status: 'started', message: 'Validating prompt...', timestamp: now() }))
        const isValid = await runGatekeeper(input.prompt)

        if (!isValid) {
          controller.enqueue(encode({ agent: 'gatekeeper', status: 'rejected', message: 'Prompt is not related to cloud infrastructure. Please describe a cloud architecture requirement.', timestamp: now() }))
          controller.close()
          return
        }

        controller.enqueue(encode({ agent: 'gatekeeper', status: 'completed', message: 'Prompt validated — cloud infrastructure request confirmed.', timestamp: now() }))

        // Agent 1: Architect
        controller.enqueue(encode({ agent: 'architect', status: 'started', message: 'Building resource dependency plan...', timestamp: now() }))
        const archPlan = await runArchitect(input.prompt)
        controller.enqueue(encode({ agent: 'architect', status: 'completed', message: `Plan complete — ${archPlan.resources.length} resources identified on ${archPlan.provider.toUpperCase()}.`, payload: archPlan, timestamp: now() }))

        // Agent 2 + 3: Engineer + Auditor with retry
        let terraformCode = ''
        let lastError: string | undefined
        let passed = false

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          controller.enqueue(encode({ agent: 'engineer', status: 'started', message: attempt === 1 ? 'Generating Terraform HCL...' : `Retry ${attempt}/${MAX_RETRIES} — fixing issues...`, timestamp: now() }))
          terraformCode = await runEngineer(archPlan, lastError)
          controller.enqueue(encode({ agent: 'engineer', status: 'completed', message: 'Terraform code generated.', timestamp: now() }))

          controller.enqueue(encode({ agent: 'auditor', status: 'started', message: 'Running syntax and security audit...', timestamp: now() }))
          const audit = await runAuditor(terraformCode)

          if (audit.passed) {
            passed = true
            controller.enqueue(encode({ agent: 'auditor', status: 'completed', message: 'PASSED — all checks clear.', timestamp: now() }))
            break
          } else {
            lastError = audit.error
            controller.enqueue(encode({ agent: 'auditor', status: 'rejected', message: `REJECTED (attempt ${attempt}/${MAX_RETRIES}): ${audit.error}`, timestamp: now() }))
            if (attempt === MAX_RETRIES) {
              controller.enqueue(encode({ agent: 'auditor', status: 'error', message: 'Max retries reached. Please refine your prompt and try again.', timestamp: now() }))
              controller.close()
              return
            }
          }
        }

        if (!passed) { controller.close(); return }

        // Save to Supabase
        const { data: blueprint } = await supabase
          .from('blueprints')
          .insert({
            user_id: user.id,
            org_id: user.user_metadata?.org_id ?? null,
            prompt: input.prompt,
            arch_plan: archPlan,
            terraform_code: terraformCode,
            audit_result: 'PASSED',
          })
          .select()
          .single()

        controller.enqueue(encode({
          agent: 'auditor',
          status: 'completed',
          message: 'Blueprint saved.',
          payload: { blueprint_id: blueprint?.id, terraform_code: terraformCode, arch_plan: archPlan },
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
    },
  })
}
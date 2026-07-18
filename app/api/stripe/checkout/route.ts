import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { z } from 'zod'

const Schema = z.object({
  plan_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: plan, error: planError } = await serviceClient
    .from('plans')
    .select('*')
    .eq('id', parsed.data.plan_id)
    .single()

  if (planError || !plan) {
    return Response.json({ error: 'Plan not found' }, { status: 404 })
  }
  if (!plan.stripe_price_id) {
    return Response.json({ error: 'This plan is not yet available for self-serve checkout. Contact info@nexplan.io.' }, { status: 400 })
  }

  // Reuse an existing Stripe customer for this user if one already exists,
  // so a returning customer doesn't get duplicate Stripe customer records.
  const { data: existingSub } = await serviceClient
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arch.nexplan.io'

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      customer: existingSub?.stripe_customer_id || undefined,
      customer_email: existingSub?.stripe_customer_id ? undefined : (user.email ?? undefined),
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_id: plan.id },
      subscription_data: { metadata: { user_id: user.id, plan_id: plan.id } },
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=cancelled`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session creation failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error creating checkout session'
    return Response.json({ error: message }, { status: 500 })
  }
}

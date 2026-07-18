import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { config } from '@/lib/config'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function planIdForPriceId(priceId: string | undefined): Promise<string | null> {
  if (!priceId) return null
  const { data } = await serviceClient().from('plans').select('id').eq('stripe_price_id', priceId).maybeSingle()
  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const stripeClient = getStripe()
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, signature!, config.stripe.webhook_secret)
  } catch (err) {
    return Response.json({ error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 400 })
  }

  const db = serviceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id || session.metadata?.user_id
      const planId = session.metadata?.plan_id
      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

      if (!userId || !planId) break

      let expiresAt: string | null = null
      if (stripeSubscriptionId) {
        const sub = await stripeClient.subscriptions.retrieve(stripeSubscriptionId)
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
        if (periodEnd) expiresAt = new Date(periodEnd * 1000).toISOString()
      }

      await db.from('subscriptions').upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: 'active',
          billing_cycle: 'monthly',
          blueprints_used: 0,
          expires_at: expiresAt,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
        },
        { onConflict: 'user_id' }
      )
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSubscriptionId = typeof (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription === 'string'
        ? (invoice as unknown as { subscription?: string }).subscription
        : (invoice as unknown as { subscription?: Stripe.Subscription }).subscription?.id

      // Only reset usage on actual renewals, not the very first payment
      // (checkout.session.completed already handles the initial activation).
      if (invoice.billing_reason !== 'subscription_cycle' || !stripeSubscriptionId) break

      const sub = await stripeClient.subscriptions.retrieve(stripeSubscriptionId)
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
      const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

      await db
        .from('subscriptions')
        .update({ blueprints_used: 0, status: 'active', expires_at: expiresAt })
        .eq('stripe_subscription_id', stripeSubscriptionId)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price?.id
      const planId = await planIdForPriceId(priceId)
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
      const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

      const updates: Record<string, unknown> = {
        status: sub.status === 'active' ? 'active' : sub.status,
        expires_at: expiresAt,
      }
      if (planId) updates.plan_id = planId

      await db.from('subscriptions').update(updates).eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      // Mark canceled rather than deleting the row — existing enforcement
      // logic only treats status='active' rows as a paid plan, so this
      // correctly reverts the user to Scout (free tier) behaviour.
      await db.from('subscriptions').update({ status: 'canceled' }).eq('stripe_subscription_id', sub.id)
      break
    }

    default:
      break
  }

  return Response.json({ received: true })
}

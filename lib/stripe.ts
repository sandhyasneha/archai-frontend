import Stripe from 'stripe'
import { config } from '@/lib/config'

// Lazily instantiated so that build-time page-data collection (which imports
// this module) never fails just because STRIPE_SECRET_KEY isn't present in
// that particular environment/step — the key is only required once a Stripe
// API call is actually made at request time.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(config.stripe.secret_key)
  }
  return _stripe
}

import { createClient } from '@supabase/supabase-js';

// Uses the service-role client so it can read across tables regardless of
// RLS — this file only ever runs server-side (API routes).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AccountContext {
  user_id: string | null;
  email: string | null;
  email_verified: boolean | null;
  plan_name: string | null; // e.g. 'scout', 'pro' — plans.name
  plan_display_name: string | null; // e.g. 'Scout', 'Pro' — plans.display_name
  subscription_status: string | null; // subscriptions.status
  blueprints_used_this_period: number | null;
  blueprint_limit: number | null; // null = unlimited
  cloud_access: string[] | null; // plans.clouds
  recent_blueprints: Array<{
    id: string;
    prompt: string;
    audit_result: string | null;
    retry_count: number;
    created_at: string;
  }>;
  // Blueprints whose audit_result indicates a rejection, pulled from the
  // same recent_blueprints set rather than a separate table (there isn't
  // one — audit_result lives directly on each blueprint row).
  // ASSUMPTION: a rejected/failed audit_result is any value that isn't
  // exactly 'PASSED' (matching the Auditor Agent's documented output
  // format: "PASSED" | "REJECTED: <reason>"). Confirm this matches what's
  // actually being written to audit_result before relying on it in
  // production — if the real values differ, adjust the isRejected() check
  // below.
  recent_audit_rejections: Array<{
    blueprint_id: string;
    audit_result: string;
    created_at: string;
  }>;
}

function isRejected(auditResult: string | null): boolean {
  if (!auditResult) return false;
  return auditResult.trim().toUpperCase() !== 'PASSED';
}

/**
 * Builds a snapshot of everything the Gatekeeper/Diagnostician agents need
 * to tell "you're hitting a real plan limit" apart from "this is a bug."
 *
 * Schema (confirmed against live Supabase, not guessed):
 *   subscriptions: id, user_id, plan_id (-> plans.id), status, billing_cycle,
 *     started_at, expires_at, blueprints_used, blueprints_reset_at,
 *     stripe_customer_id, stripe_subscription_id
 *   plans: id, name, display_name, price_monthly, price_yearly,
 *     blueprint_limit, clouds (array), features (jsonb), stripe_price_id
 *   blueprints: id, project_id, user_id, org_id, prompt, arch_plan,
 *     terraform_code, audit_result, security_findings, cost_estimate,
 *     dr_config, retry_count, created_at
 *     (no `name` or `status` column — audit_result + retry_count are the
 *     pass/fail signal; there is no separate auditor_rejections table)
 */
export async function buildAccountContext(userId: string | null): Promise<AccountContext> {
  if (!userId) {
    return {
      user_id: null,
      email: null,
      email_verified: null,
      plan_name: null,
      plan_display_name: null,
      subscription_status: null,
      blueprints_used_this_period: null,
      blueprint_limit: null,
      cloud_access: null,
      recent_blueprints: [],
      recent_audit_rejections: [],
    };
  }

  const [{ data: userRow }, { data: subRow }, { data: blueprints }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin
      .from('subscriptions')
      .select('*, plans(name, display_name, blueprint_limit, clouds)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('blueprints')
      .select('id, prompt, audit_result, retry_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // subRow.plans comes back as a joined object (or array, depending on the
  // FK relationship direction Supabase infers) — normalize both shapes.
  const planJoin: any = Array.isArray((subRow as any)?.plans)
    ? (subRow as any).plans[0]
    : (subRow as any)?.plans;

  const recentBlueprints = blueprints || [];
  const recentRejections = recentBlueprints
    .filter((b) => isRejected(b.audit_result))
    .map((b) => ({
      blueprint_id: b.id,
      audit_result: b.audit_result as string,
      created_at: b.created_at,
    }));

  return {
    user_id: userId,
    email: userRow?.user?.email ?? null,
    email_verified: !!userRow?.user?.email_confirmed_at,
    plan_name: planJoin?.name ?? null,
    plan_display_name: planJoin?.display_name ?? null,
    subscription_status: subRow?.status ?? 'none',
    blueprints_used_this_period: subRow?.blueprints_used ?? recentBlueprints.length,
    blueprint_limit: planJoin?.blueprint_limit ?? null,
    cloud_access: planJoin?.clouds ?? null,
    recent_blueprints: recentBlueprints,
    recent_audit_rejections: recentRejections,
  };
}

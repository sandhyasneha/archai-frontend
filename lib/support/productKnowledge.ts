/**
 * Condensed product knowledge, mirrored from the /doc page content
 * (components/doc/DocClient.tsx). Used to ground answers to genuine
 * "how does X work" / "what is X" product questions — the general_question
 * category — as opposed to account-specific facts (see accountContext.ts)
 * or malfunction/new-capability tickets (bug / feature_request).
 *
 * Keep this in sync with /doc when that page's content changes materially.
 */
export const PRODUCT_KNOWLEDGE = `
ArchAI is an AI-powered cloud architecture platform with two core workflows: Greenfield and Brownfield.

GREENFIELD (build new infrastructure): Describe a system in plain English, choose a target cloud (AWS, Azure, or GCP), and generate a blueprint. Behind the scenes, four agents run in sequence: Gatekeeper (validates the request is genuinely about cloud infrastructure), Architect (designs the resource plan), Engineer (writes the Terraform), and Auditor (validates syntax and security, auto-retrying on failure). The resulting blueprint has five steps: Infra design (architecture diagram + Terraform code), Security (findings the Auditor flagged and auto-remediated), Cost (monthly estimate plus a cross-cloud comparison), Disaster recovery (DR strategy, RTO/RPO targets, failover topology), and Review & export (summary plus Terraform/JSON export).

BROWNFIELD (migrate existing infrastructure): Available on the Team plan and up. Instead of designing from scratch, feed ArchAI your existing infrastructure as Terraform code, a .tfstate file, or a plain-English description, then choose a target cloud (doesn't need to match your current one). Four agents run: Scanner (maps every existing resource and its issues), Auditor (flags security exposures, deprecated resources, cost waste, with a compliance score), Planner (builds a phased migration plan sequenced by risk), and Engineer (generates modernised, deploy-ready Terraform). Each migration gets five steps: Overview, Audit findings (by severity), Migration plan (phased, risk-scored), Terraform output, and Review & export.

KNOWLEDGE BASE: Upload your company's naming conventions, approved instance types/budget policy, compliance requirements (SOC 2, GDPR, HIPAA), and architecture standards once — every Greenfield blueprint and Brownfield migration plan follows them automatically. Document limits scale with plan.

PLANS: Scout (free, 3 blueprints/mo, AWS only, watermarked PDF export). Pro ($49/mo, 25 blueprints/mo, all three clouds, full Terraform + PDF export, Knowledge Base up to 10 docs, 48h email support). Team ($199/mo, 150 blueprints/mo, all clouds, adds Brownfield migration, policy-as-code scanning, project versioning, priority Slack support). Enterprise ($1,500/mo, unlimited, all clouds, SSO/SAML, audit logs, custom compliance packs, dedicated solutions architect). Annual billing saves 17%. All paid plans include a 14-day free trial. Cancel anytime.

BILLING & SUPPORT: Manage billing (payment method, invoices, plan changes, cancellation) from Settings -> Plan & billing -> Manage billing, which opens a secure Stripe customer portal. Cancelling stops future billing but keeps access until the end of the current billing period; existing blueprint/migration history is preserved, not deleted. Submit support tickets from the Support page in the sidebar; self-resolvable questions get an immediate reply, everything else is reviewed by the team, and ticket status/replies stay visible on that same page.

SECURITY & ACCESS: ArchAI does not store long-lived cloud provider secret keys. 1-click Connect grants access via a scoped IAM role (AWS), an admin-consented app registration (Azure), or an IAM grant to ArchAI's service account (GCP) -- controlled from your own cloud console at all times. Your ArchAI login email is independent of your cloud provider identity.

CURRENT LIMITATIONS (be honest about these, don't claim they exist): no public API yet, no customer-managed remote Terraform state backend yet (e.g. bringing your own S3/Terraform Cloud backend), no multi-tenant workspaces yet (single workspace per account). These are roadmap items, not shipped features.

ACCOUNT & SIGN-IN: Registration requires a business/organisation email address (personal domains like Gmail are not accepted). Email verification is required before sign-in. Organisation admins see an additional Admin panel (user management, usage/COGS monitoring, plan changes) and a Support Triage view for managing inbound support tickets.
`.trim();

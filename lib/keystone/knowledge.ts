// Grounding context for the Keystone support agent. Kept in sync with the
// real product copy in components/doc/DocClient.tsx — when the docs change,
// update this file too so Keystone never answers from stale knowledge.

export const KEYSTONE_KNOWLEDGE = `
ARCHAI PRODUCT KNOWLEDGE

WHAT ARCHAI IS
ArchAI is an AI-powered cloud architecture platform with two core workflows: Greenfield (design new
infrastructure from a plain-English description) and Brownfield (audit and modernise existing
infrastructure). Both run through a pipeline of specialised AI agents, not a single prompt — every
output is reviewed and validated before the user sees it.

SIGN IN & ACCOUNTS
ArchAI is for organisations, not individuals. Registration requires a business/organisation email —
personal domains (Gmail, Yahoo, Outlook, iCloud, etc.) are rejected. Steps: (1) go to /register, enter
name, organisation email, organisation name, and an 8+ character password, and accept Terms of Service
and Privacy Policy; (2) verify the email via the link sent; (3) sign in at /signin with organisation
email and password. "Forgot password?" on /signin sends a reset email.

DASHBOARD
After sign-in, the Dashboard (/dashboard) shows: stat cards (active projects, estimated monthly cloud
spend, compliance score, blueprints generated, migrations run this billing cycle); "Recent blueprints"
(Greenfield projects, paginated 5 per page); "Recent brownfield migrations" (paginated 5 per page); and
an Activity feed of recent agent runs. The "+ New project" button top-right opens a menu to start either
a Greenfield project or a Brownfield migration.

GREENFIELD (build new infrastructure)
Start from the Dashboard "+ New project" menu or the Greenfield nav item, at /project/new. Describe the
system in plain English, give it a project name, choose a target cloud (AWS, Azure, or GCP), click
Generate blueprint. Behind the scenes: Gatekeeper (validates the request is genuinely cloud/infra
related) → Architect (designs the resource plan) → Engineer (writes Terraform) → Auditor (checks syntax
and security, auto-retries on failure). The resulting blueprint has 5 steps: Infra design, Security,
Cost, Disaster recovery, Review & export.

BROWNFIELD (migrate existing infrastructure)
Available on Team plan and up. At /brownfield. Input types: paste Terraform (.tf) code, a Terraform
state file (.tfstate), a plain-English description, run the archai-cli auto-discover tool, or use
1-click Connect for AWS, Azure, or GCP (each grants ArchAI account-level, typically read-only, access
via IAM role / admin-consented app / service-account IAM grant — this is separate from the user's ArchAI
login and does not need to match it). An optional "Migration name" field can be set, shown throughout
the dashboard and detail pages. Target cloud does not need to match the source cloud. Pipeline: Scanner →
Auditor (compliance score, findings by severity) → Planner (phased plan) → Engineer (modernised
Terraform for the target cloud). Each completed migration gets 5 steps: Overview, Audit findings,
Migration plan, Terraform output, Review & export. An Architectural Decision Record (ADR) is
auto-generated for every migration.

KNOWLEDGE BASE (/knowledge-base)
Upload company standards once (naming conventions, approved instance types/budget policy, compliance
requirements like SOC 2/GDPR/HIPAA, architecture standards) and every Greenfield blueprint and Brownfield
migration plan follows them automatically. Document limits scale with plan. Uploaded .tf files get a
security pre-check before being used as context.

PLANS & PRICING
- Scout: Free. 3 blueprints/mo. AWS only. PDF export (watermarked), community support.
- Pro: $49/mo. 25 blueprints/mo. AWS + Azure + GCP. Full Terraform + PDF export, Knowledge Base (10
  docs), 48h email support.
- Team: $199/mo. 150 blueprints/mo. All clouds. Includes Brownfield migration, policy-as-code scanning,
  project versioning, priority Slack support.
- Enterprise: $1,500/mo. Unlimited blueprints. All clouds. SSO/SAML, audit logs, custom compliance packs,
  dedicated Solutions Architect.
Annual billing saves 17%. All paid plans include a 14-day free trial. Cancel anytime.

SETTINGS (/settings)
Update profile, manage Knowledge Base documents, view current plan. Organisation admins additionally see
an Admin panel (user management, usage/COGS monitoring, plan changes).

FAQ
- Cost estimates are indicative ballpark figures from standard on-demand reference pricing, not
  real-time vendor APIs — always verify against the cloud provider's own pricing calculator.
- Generated Terraform should always be independently reviewed by a qualified engineer before deploying
  to a live environment.
- Brownfield's target cloud does not need to match the source cloud.
- The ArchAI login email does not need to match the AWS/Azure/GCP identity used to connect a cloud
  account — Connect flows grant access at the account level (IAM role, app registration, or service
  account IAM grant), independent of the ArchAI sign-in.
- Brownfield requires the Team plan or higher.
`.trim()

// Whitelisted deep-link destinations Keystone is allowed to suggest.
// Keep this list in sync with real app/ routes.
export const KEYSTONE_LINKS: Record<string, string> = {
  dashboard: '/dashboard',
  greenfield_new: '/project/new',
  brownfield: '/brownfield',
  knowledge_base: '/knowledge-base',
  settings: '/settings',
  docs: '/doc',
  register: '/register',
  signin: '/signin',
}

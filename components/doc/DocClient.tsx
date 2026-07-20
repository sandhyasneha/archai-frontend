'use client'

import { useState } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'account' | 'dashboard' | 'greenfield' | 'brownfield' | 'knowledge-base' | 'plans' | 'settings' | 'support' | 'admin' | 'faq'

const NAV: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'account', label: 'Sign in & accounts' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'greenfield', label: 'Greenfield' },
  { id: 'brownfield', label: 'Brownfield' },
  { id: 'knowledge-base', label: 'Knowledge Base' },
  { id: 'plans', label: 'Plans & features' },
  { id: 'settings', label: 'Settings & account' },
  { id: 'support', label: 'Support & billing' },
  { id: 'admin', label: 'Admin guide' },
  { id: 'faq', label: 'FAQ' },
]

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border border-gray-100 rounded-xl p-5">
      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{num}</div>
      <div>
        <div className="text-sm font-semibold text-black mb-1">{title}</div>
        <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-black mb-1">{q}</p>
      <p className="text-gray-700">{children}</p>
    </div>
  )
}

function FaqGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mt-2">{title}</h2>
      {children}
    </div>
  )
}

export default function DocClient() {
  const [active, setActive] = useState<Tab>('overview')

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[260px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">A</div>
            <span className="text-sm font-bold tracking-widest uppercase">ArchAI Docs</span>
          </Link>
        </div>

        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={[
                'flex items-center px-2.5 py-2 rounded-md text-sm transition-colors w-full text-left',
                active === n.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black',
              ].join(' ')}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div className="px-3 py-3.5 border-t border-gray-100 flex flex-col gap-2">
          <Link href="/signin" className="text-xs text-gray-400 hover:text-black transition-colors text-center py-1.5">Sign in</Link>
          <Link href="/register" className="text-xs bg-black text-white px-3 py-2 rounded-md font-medium hover:opacity-85 transition-opacity text-center">Start free</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-2xl">

          {active === 'overview' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Overview</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>ArchAI is an AI-powered cloud architecture platform with two core workflows:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li><strong>Greenfield</strong> — describe a new system in plain English and get a production-ready blueprint: architecture, Terraform code, security audit, cost estimate, and disaster recovery plan.</li>
                  <li><strong>Brownfield</strong> — paste existing Terraform, a state file, or a description of your current setup, and get a security/cost audit, a phased migration plan, and modernised Terraform for your target cloud. (Team plan and up.)</li>
                </ul>
                <p>Both workflows run through a pipeline of specialised AI agents rather than a single prompt, so every blueprint or migration plan is reviewed and validated before you see it.</p>
              </div>
            </div>
          )}

          {active === 'account' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Sign in &amp; accounts</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>
                  ArchAI is built for organisations, not individuals. You must register with a business or
                  organisation email address — personal domains (Gmail, Yahoo, etc.) are not accepted.
                </p>
                <div className="flex flex-col gap-3">
                  <Step num={1} title="Create an account">
                    Go to <Link href="/register" className="text-black underline">/register</Link>, enter your name, organisation email, organisation name, and a password (minimum 8 characters). You&apos;ll need to accept the Terms of Service and Privacy Policy to continue.
                  </Step>
                  <Step num={2} title="Verify your email">
                    A verification link is sent to your organisation email. You must verify before signing in.
                  </Step>
                  <Step num={3} title="Sign in">
                    Use your organisation email and password at <Link href="/signin" className="text-black underline">/signin</Link>. Forgot your password? Use the &quot;Forgot password?&quot; link to receive a reset email.
                  </Step>
                </div>
              </div>
            </div>
          )}

          {active === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Dashboard</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>After signing in you land on the Dashboard, which shows:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li><strong>Stat cards</strong> — active projects, estimated monthly cloud spend, compliance score, blueprints generated, and migrations run this billing cycle.</li>
                  <li><strong>Recent blueprints</strong> — your Greenfield projects, with status, cloud provider, resource count, and quick actions (view, download Terraform).</li>
                  <li><strong>Recent brownfield migrations</strong> — your Brownfield migrations, with source/target cloud, finding count, and the same quick actions.</li>
                  <li><strong>Activity</strong> — a running log of recent agent runs.</li>
                </ul>
                <p>Clicking any row opens that project&apos;s full detail page with its step-by-step wizard.</p>
              </div>
            </div>
          )}

          {active === 'greenfield' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Greenfield — build new infrastructure</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>
                  Start a Greenfield project from the Dashboard (&quot;+ New project&quot;) or the Greenfield nav item. You&apos;ll describe your system in plain English, choose a target cloud (AWS, Azure, or GCP), and click Generate blueprint.
                </p>
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  Behind the scenes, your prompt passes through four agents in sequence — <strong>Gatekeeper</strong> (validates the request is genuinely about cloud infrastructure), <strong>Architect</strong> (designs the resource plan), <strong>Engineer</strong> (writes the Terraform), and <strong>Auditor</strong> (validates syntax and security, auto-retrying on failure). You only see output the Auditor has passed.
                </p>
                <p>The resulting blueprint has five steps, navigable from the left sidebar:</p>
                <div className="flex flex-col gap-3">
                  <Step num={1} title="Infra design">The architecture diagram and generated Terraform code, side by side.</Step>
                  <Step num={2} title="Security">Findings the Auditor flagged and auto-remediated — exposed databases, wildcard IAM policies, missing encryption — each with severity and resolution.</Step>
                  <Step num={3} title="Cost">A monthly cost estimate for your chosen provider, plus a side-by-side comparison against the other two clouds.</Step>
                  <Step num={4} title="Disaster recovery">Recommended DR strategy (e.g. Warm Standby), RTO/RPO targets, and a failover topology diagram.</Step>
                  <Step num={5} title="Review & export">A full summary, plus buttons to download Terraform, copy it to clipboard, or export the whole blueprint as JSON.</Step>
                </div>
              </div>
            </div>
          )}

          {active === 'brownfield' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Brownfield — migrate existing infrastructure</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>
                  Brownfield is available on the <strong>Team plan and up</strong>. Instead of designing from scratch, you feed ArchAI your existing infrastructure and it produces an audit and a modernisation plan.
                </p>
                <p><strong>Input types</strong> — you can provide your existing setup as:</p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>Terraform (.tf) code</li>
                  <li>A Terraform state file (.tfstate)</li>
                  <li>A plain-English description of your current setup</li>
                </ul>
                <p>Then choose your target cloud (AWS, Azure, or GCP — it does not need to match your current one) and run the analysis.</p>
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  Four agents run in sequence — <strong>Scanner</strong> (maps every existing resource and its issues), <strong>Auditor</strong> (flags security exposures, deprecated resources, and cost waste, with a compliance score), <strong>Planner</strong> (builds a phased migration plan sequenced by risk), and <strong>Engineer</strong> (generates modernised, deploy-ready Terraform for your target cloud).
                </p>
                <p>Each completed migration gets its own page with five steps:</p>
                <div className="flex flex-col gap-3">
                  <Step num={1} title="Overview">Resources scanned, findings, compliance score, estimated monthly saving, and migration time at a glance.</Step>
                  <Step num={2} title="Audit findings">Every issue found, grouped by severity (critical/high/medium/low), with a specific recommendation for each.</Step>
                  <Step num={3} title="Migration plan">A phased plan — each phase risk-scored, with an estimated hours figure and a description of what changes.</Step>
                  <Step num={4} title="Terraform output">The modernised, ready-to-deploy Terraform for your target cloud, with copy and download options.</Step>
                  <Step num={5} title="Review & export">Full summary and export options, same as Greenfield.</Step>
                </div>
                <p>Past migrations are listed on your Dashboard under &quot;Recent brownfield migrations&quot; — click any row to revisit it.</p>
              </div>
            </div>
          )}

          {active === 'knowledge-base' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Knowledge Base</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>
                  The Knowledge Base is what separates ArchAI from a generic AI wrapper. Upload your company&apos;s standards once, and every Greenfield blueprint and Brownfield migration plan follows them automatically:
                </p>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li><strong>Naming conventions</strong> — e.g. <code className="bg-gray-100 px-1 rounded text-xs">prod-payments-vpc-use1</code> pattern enforcement.</li>
                  <li><strong>Approved instance types &amp; budget policy</strong> — no unapproved or deprecated instances are generated.</li>
                  <li><strong>Compliance requirements</strong> — SOC 2, GDPR, HIPAA rules relevant to your organisation.</li>
                  <li><strong>Architecture standards</strong> — regions, tagging policy, and other conventions.</li>
                </ul>
                <p>Upload documents from the Knowledge Base page in the sidebar. Document limits scale with your plan.</p>
              </div>
            </div>
          )}

          {active === 'plans' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Plans &amp; features</h1>
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Plan</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Price</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Blueprints/mo</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Clouds</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Key features</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-50">
                        <td className="py-2.5 px-3 font-medium text-black">Scout</td>
                        <td className="py-2.5 px-3">Free</td>
                        <td className="py-2.5 px-3">3</td>
                        <td className="py-2.5 px-3">AWS only</td>
                        <td className="py-2.5 px-3">PDF export (watermarked), community support</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2.5 px-3 font-medium text-black">Pro</td>
                        <td className="py-2.5 px-3">$49/mo</td>
                        <td className="py-2.5 px-3">25</td>
                        <td className="py-2.5 px-3">AWS + Azure + GCP</td>
                        <td className="py-2.5 px-3">Full Terraform + PDF export, Knowledge Base (10 docs), 48h email support</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2.5 px-3 font-medium text-black">Team</td>
                        <td className="py-2.5 px-3">$199/mo</td>
                        <td className="py-2.5 px-3">150</td>
                        <td className="py-2.5 px-3">All clouds</td>
                        <td className="py-2.5 px-3"><strong>Brownfield migration</strong>, policy-as-code scanning, project versioning, priority Slack support</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-black">Enterprise</td>
                        <td className="py-2.5 px-3">$1,500/mo</td>
                        <td className="py-2.5 px-3">Unlimited</td>
                        <td className="py-2.5 px-3">All clouds</td>
                        <td className="py-2.5 px-3">SSO/SAML, audit logs, custom compliance packs, dedicated SA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400">Annual billing saves 17%. All paid plans include a 14-day free trial. Cancel anytime.</p>
              </div>
            </div>
          )}

          {active === 'settings' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Settings &amp; account</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>
                  From Settings you can update your profile, manage your Knowledge Base documents, and view your
                  current plan. Organisation admins additionally see an Admin panel with user management,
                  usage/COGS monitoring, and plan changes for their organisation.
                </p>
              </div>
            </div>
          )}

          {active === 'support' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Support &amp; billing</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>Everything about getting help, and managing your subscription, lives in one place: <strong>Settings</strong> for billing, <strong>Support</strong> for tickets.</p>

                <div className="flex flex-col gap-3">
                  <Step num={1} title="Submit a ticket">
                    Go to <Link href="/support" className="text-black underline">Support</Link> in the sidebar, describe what&apos;s wrong, and submit. If it&apos;s something we can answer from your account directly (a plan limit, an unverified email, etc.) you&apos;ll get a reply immediately. Anything else is flagged for our team.
                  </Step>
                  <Step num={2} title="Track your tickets">
                    Every ticket you&apos;ve submitted, along with its current status and any reply, stays listed on the Support page — you don&apos;t need to keep the original confirmation.
                  </Step>
                  <Step num={3} title="Manage billing">
                    In Settings, under Plan &amp; billing, use &quot;Manage billing&quot; to open a secure Stripe portal where you can update your card, view invoices, change plans, or cancel.
                  </Step>
                  <Step num={4} title="Cancel anytime">
                    Cancelling stops future billing but keeps your access until the end of your current billing period. Your blueprint and migration history is preserved — it isn&apos;t deleted on cancellation, though creating new ones reverts to Scout (free tier) limits once your paid period ends.
                  </Step>
                </div>
              </div>
            </div>
          )}

          {active === 'admin' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">Admin guide</h1>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-700">
                <p>
                  If you&apos;re an organisation admin, you&apos;ll see an <strong>Admin</strong> section in the sidebar automatically
                  once signed in — no separate login required.
                </p>

                <div className="flex flex-col gap-3">
                  <Step num={1} title="Admin panel">
                    User signups, blueprint/migration volume, and usage/COGS monitoring across your organisation, plus the ability to manually adjust a user&apos;s plan if needed.
                  </Step>
                  <Step num={2} title="Support Triage">
                    Every support ticket lands here, automatically classified as <strong>self-resolvable</strong> (already answered, informational only), <strong>bug</strong>, <strong>feature request</strong>, or <strong>unclear</strong> (needs your judgment directly — e.g. pricing negotiations). Use the status filter and date range to narrow a busy queue.
                  </Step>
                  <Step num={3} title="Reviewing a drafted fix or feature">
                    For bug and feature-request tickets, you&apos;ll typically see a diagnosis or proposal, a summary of the proposed change, and setup/testing instructions (new dependencies, env vars, manual test steps) before any code is written to your repository.
                  </Step>
                  <Step num={4} title="Approve, Hold, or build manually">
                    <strong>Approve</strong> opens a pull request on a new branch, it is never merged automatically. <strong>Hold</strong> parks the ticket for later without opening anything. Either way, nothing reaches your main branch or gets deployed without you reviewing and merging the PR yourself.
                  </Step>
                  <Step num={5} title="Mark Implemented">
                    Once you&apos;ve tested the PR locally, merged it, and confirmed the deploy, come back and mark the ticket Implemented — this closes the loop and updates your resolved-ticket count.
                  </Step>
                </div>

                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  Nothing in Support Triage auto-deploys. Every drafted fix or feature is a proposal for you to review, test, and merge on your own judgment.
                </p>
              </div>
            </div>
          )}

          {active === 'faq' && (
            <div>
              <h1 className="text-2xl font-semibold text-black mb-4">FAQ</h1>
              <div className="flex flex-col gap-8 text-sm leading-relaxed">

                <FaqGroup title="General">
                  <FaqItem q="Are the cost estimates live pricing?">
                    No — they&apos;re indicative ballpark estimates from standard on-demand reference pricing, not real-time vendor APIs. Always verify against your cloud provider&apos;s official pricing calculator before making a financial decision. See our <Link href="/terms" className="text-black underline">Terms of Service</Link> for details.
                  </FaqItem>
                  <FaqItem q="Can I deploy the generated Terraform directly to production?">
                    Generated output should always be independently reviewed by a qualified engineer before deployment to any live environment — see our Terms of Service for the full disclaimer.
                  </FaqItem>
                  <FaqItem q="Does Brownfield require my target cloud to match my current one?">
                    No — you can migrate from any source cloud to any target cloud (AWS, Azure, or GCP).
                  </FaqItem>
                  <FaqItem q="Does my ArchAI login email need to match my AWS, Azure, or GCP account?">
                    No. Your ArchAI sign-in is separate from your cloud provider identity. When you use 1-click Connect, access is granted at the account level — via an IAM role (AWS), an admin-consented app registration (Azure), or an IAM grant to ArchAI&apos;s service account (GCP) — by whoever has sufficient permissions in that cloud console at the time. That person doesn&apos;t need to share an email with your ArchAI account.
                  </FaqItem>
                  <FaqItem q="Which plan do I need for Brownfield?">
                    Team plan or higher.
                  </FaqItem>
                </FaqGroup>

                <FaqGroup title="Payments & subscription">
                  <FaqItem q="How do I update my payment method?">
                    Go to Settings → Plan &amp; billing → Manage billing. This opens a secure Stripe portal where you can update your card, view past invoices, or download receipts.
                  </FaqItem>
                  <FaqItem q="How do I upgrade or downgrade my plan?">
                    From Settings → Plan &amp; billing, choose a new plan. Stripe prorates the difference automatically — you&apos;re not double-charged mid-cycle.
                  </FaqItem>
                  <FaqItem q="How do I cancel my subscription?">
                    Settings → Plan &amp; billing → Manage billing → Cancel plan. You keep full access until the end of your current billing period; there&apos;s no immediate loss of access.
                  </FaqItem>
                  <FaqItem q="What happens to my blueprints if I downgrade or cancel?">
                    Your existing blueprint and migration history is preserved and stays viewable — it isn&apos;t deleted. Creating new blueprints, however, follows whatever plan you&apos;re on going forward (e.g. Scout&apos;s 3/month, AWS-only limit once a paid plan lapses).
                  </FaqItem>
                  <FaqItem q="What happens if a payment fails?">
                    Stripe automatically retries the charge. You&apos;ll get an email notification if a payment fails, and if it remains unresolved your account will eventually revert to the free Scout tier rather than being locked out entirely.
                  </FaqItem>
                  <FaqItem q="Where do I find an invoice or receipt?">
                    Settings → Plan &amp; billing → Manage billing opens the Stripe Customer Portal, where every past invoice is available to view or download.
                  </FaqItem>
                </FaqGroup>

                <FaqGroup title="Support tickets">
                  <FaqItem q="How do I submit a support ticket?">
                    Go to Support in the sidebar and describe what&apos;s going on. If it&apos;s something answerable from your account directly (a plan limit, verification status, etc.) you&apos;ll get a reply immediately.
                  </FaqItem>
                  <FaqItem q="How long does it take to hear back on a bug report or feature request?">
                    There&apos;s no fixed SLA today — these are reviewed by our team, who may draft and ship a fix depending on complexity and priority. You can always check a ticket&apos;s current status on the Support page.
                  </FaqItem>
                  <FaqItem q="Can I see the status of a ticket I already submitted?">
                    Yes — every ticket you&apos;ve submitted, along with any reply, is listed on the Support page under &quot;Your tickets.&quot;
                  </FaqItem>
                  <FaqItem q="What's the difference between a 'bug' and a 'feature request' ticket?">
                    A bug means something isn&apos;t working as intended; a feature request means you&apos;re asking for a capability that doesn&apos;t exist yet. Both get reviewed by our team before anything ships — submitting either doesn&apos;t guarantee immediate action.
                  </FaqItem>
                </FaqGroup>

                <FaqGroup title="Technical">
                  <FaqItem q="Does ArchAI store my cloud provider credentials?">
                    No long-lived secret keys are stored. 1-click Connect grants access via a scoped IAM role (AWS), an admin-consented app registration (Azure), or an IAM grant to ArchAI&apos;s service account (GCP) — access is controlled from your own cloud console at all times.
                  </FaqItem>
                  <FaqItem q="Is my generated Terraform code saved anywhere?">
                    Yes — it&apos;s tied to your account and accessible any time from your Dashboard, so you can revisit or re-download it later.
                  </FaqItem>
                  <FaqItem q="Can I bring my own remote Terraform state backend (e.g. S3, Terraform Cloud)?">
                    Not yet — this is on our roadmap. Today, generated Terraform is provided to you directly rather than applied against a remote backend we manage.
                  </FaqItem>
                  <FaqItem q="Is there a public API?">
                    Not at this time. If programmatic access would be useful for your team, let us know via a support ticket — that helps us prioritise it.
                  </FaqItem>
                  <FaqItem q="Do you support multi-tenant workspaces for larger teams?">
                    This is on our roadmap but not yet available — currently each account operates as a single workspace.
                  </FaqItem>
                </FaqGroup>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

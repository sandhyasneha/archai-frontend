import { ScanResult } from './scanner'
import { AuditResult } from './auditor'
import { MigrationPlan } from './planner'

/**
 * Generates a Brownfield Architectural Decision Record (ADR) following the
 * 5-step brownfield-remediation structure:
 *   1. Baseline Context Capture
 *   2. Risk & Vulnerability Delta Analysis
 *   3. Reconstruction & Import Strategy
 *   4. Refactoring Decisions & Guardrail Injections
 *   5. Drift Reconciliation Governance Policy
 *
 * Built deterministically from the Scanner/Auditor/Planner output already
 * validated earlier in the pipeline — not generated freely by an LLM —
 * since a fabricated resource ID or wrong compliance score in a document
 * meant to support a SOC 2 / HIPAA audit trail would be worse than no
 * ADR at all.
 */
export function generateADR(
  adrId: string,
  scanResult: ScanResult,
  auditResult: AuditResult,
  migrationPlan: MigrationPlan
): string {
  const date = new Date().toISOString().slice(0, 10)

  const resourceList = scanResult.resources
    .map((r) => `\`${r.name}\` (${r.type})`)
    .join(', ') || 'none identified'

  const findingsList = auditResult.findings.length > 0
    ? auditResult.findings
        .map((f) => `- **${f.resource}** (${f.severity}): ${f.issue}`)
        .join('\n')
    : '- No findings identified during this scan.'

  const phasesList = migrationPlan.phases.length > 0
    ? migrationPlan.phases
        .map((p) => `${p.phase}. **${p.title}** (${p.risk} risk, ~${p.estimated_hours}h) — ${p.description}`)
        .join('\n')
    : '1. No phased plan generated.'

  return `### Architectural Decision Record (ADR) — Brownfield Remediation
*Product of NexPlan IT LLC, Montana (nexplanit.com)*

- **ID / Status**: ${adrId} / Accepted
- **Date**: ${date}
- **Component**: ${scanResult.source_cloud.toUpperCase()} → ${migrationPlan.target_cloud.toUpperCase()} Infrastructure Reconciliation

#### 1. Baseline Context
We scanned an existing, unmanaged brownfield ${scanResult.source_cloud.toUpperCase()} environment in ${scanResult.region}, containing ${scanResult.total_resources} live resource(s): ${resourceList}. This architecture was originally configured outside of ArchAI, with no prior AI-managed Infrastructure as Code (IaC) audit trail.

#### 2. Discovered Vulnerabilities & Delta
The Auditor agent flagged ${auditResult.findings.length} finding(s) during ingestion (${auditResult.critical_count} critical, ${auditResult.high_count} high, ${auditResult.medium_count} medium, ${auditResult.low_count} low):

${findingsList}

Overall initial compliance baseline score evaluated at **${auditResult.compliance_score}/100**. Estimated monthly cost waste identified: **$${auditResult.cost_waste_usd}/mo** *(indicative estimate — see Terms of Service).*

#### 3. Import & Reconstruction Decision
Migration strategy selected: **${migrationPlan.strategy}**, targeting ${migrationPlan.target_cloud.toUpperCase()} (${migrationPlan.target_region}), executed across ${migrationPlan.total_phases} phase(s) over an estimated ${migrationPlan.estimated_days} day(s):

${phasesList}

#### 4. Implemented Technical Corrections
To remediate the findings identified in Section 2, the Engineer agent generated modernised Terraform for ${migrationPlan.target_cloud.toUpperCase()} addressing every identified issue prior to this record being accepted. The full generated configuration is available in the Terraform Output step of this migration.

#### 5. Long-Term Consequences & Governance
- **Positive:** Compliance rating projected to improve from ${auditResult.compliance_score}/100 toward a fully remediated baseline once deployed. Projected monthly cost: $${migrationPlan.cost_before_usd}/mo → $${migrationPlan.cost_after_usd}/mo (${migrationPlan.cost_saving_pct}% saving, indicative estimate).
- **Negative:** Infrastructure changes to this environment should now be managed through this IaC pipeline going forward — manual console changes will cause drift from this recorded baseline.
- **Monitoring Policy:** This environment's baseline is anchored to migration record ${adrId}. Re-run a Brownfield scan periodically to detect and reconcile any configuration drift against this record.

---
*This ADR was generated automatically by ArchAI's Brownfield pipeline from the scan, audit, and migration plan data captured above. It should be reviewed by a qualified engineer before being treated as an authoritative compliance record — see Terms of Service.*`
}

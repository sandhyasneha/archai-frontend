import { ScannedResource, ScanResult } from '@/lib/agents/brownfield/scanner'

async function gcpGet(url: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GCP request failed (${res.status}) for ${url}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

interface ComputeInstance {
  name: string
  machineType?: string
  status?: string
  networkInterfaces?: { accessConfigs?: unknown[] }[]
}

interface StorageBucket {
  name: string
  location?: string
  iamConfiguration?: {
    publicAccessPrevention?: string
    uniformBucketLevelAccess?: { enabled?: boolean }
  }
  versioning?: { enabled?: boolean }
}

interface SqlInstance {
  name: string
  region?: string
  databaseVersion?: string
  settings?: {
    tier?: string
    ipConfiguration?: { requireSsl?: boolean; ipv4Enabled?: boolean }
  }
}

/**
 * Scans Compute Engine instances, Cloud Storage buckets, and Cloud SQL
 * instances in the given project, via direct REST calls using an access
 * token for ArchAI's own service account. Same resource types/properties
 * as archai-cli's GCP provider for consistent findings regardless of
 * connection method.
 *
 * Only read (GET/list) calls are made — never a data-plane call.
 */
export async function scanGCPWithToken(
  projectId: string,
  token: string
): Promise<{ resources: ScannedResource[]; warnings: string[] }> {
  const resources: ScannedResource[] = []
  const warnings: string[] = []

  // --- Compute Engine instances (all zones, aggregated) ---
  try {
    const data = await gcpGet(
      `https://compute.googleapis.com/compute/v1/projects/${projectId}/aggregated/instances`,
      token
    )
    const items = (data.items ?? {}) as Record<string, { instances?: ComputeInstance[] }>
    for (const [zoneKey, zoneData] of Object.entries(items)) {
      for (const instance of zoneData.instances ?? []) {
        resources.push({
          type: 'google_compute_instance',
          name: instance.name ?? 'unknown',
          cloud: 'gcp',
          region: zoneKey.replace('zones/', ''),
          issues: [],
          properties: {
            machine_type: (instance.machineType ?? '').split('/').pop() ?? '',
            status: instance.status ?? '',
            has_external_ip: String(
              (instance.networkInterfaces ?? []).some((ni) => (ni.accessConfigs ?? []).length > 0)
            ),
          },
        })
      }
    }
  } catch (err) {
    warnings.push(`Compute instance scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // --- Cloud Storage buckets ---
  try {
    const data = await gcpGet(`https://storage.googleapis.com/storage/v1/b?project=${projectId}`, token)
    for (const bucket of (data.items ?? []) as StorageBucket[]) {
      resources.push({
        type: 'google_storage_bucket',
        name: bucket.name ?? 'unknown',
        cloud: 'gcp',
        region: bucket.location ?? '',
        issues: [],
        properties: {
          public_access_prevention: bucket.iamConfiguration?.publicAccessPrevention ?? 'unknown',
          uniform_bucket_level_access: String(!!bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled),
          versioning_enabled: String(!!bucket.versioning?.enabled),
        },
      })
    }
  } catch (err) {
    warnings.push(`Storage bucket scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // --- Cloud SQL instances ---
  try {
    const data = await gcpGet(`https://sqladmin.googleapis.com/sql/v1beta4/projects/${projectId}/instances`, token)
    for (const instance of (data.items ?? []) as SqlInstance[]) {
      resources.push({
        type: 'google_sql_database_instance',
        name: instance.name ?? 'unknown',
        cloud: 'gcp',
        region: instance.region ?? '',
        issues: [],
        properties: {
          database_version: instance.databaseVersion ?? '',
          tier: instance.settings?.tier ?? '',
          require_ssl: String(!!instance.settings?.ipConfiguration?.requireSsl),
          public_ip_enabled: String(!!instance.settings?.ipConfiguration?.ipv4Enabled),
        },
      })
    }
  } catch (err) {
    warnings.push(`Cloud SQL scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return { resources, warnings }
}

export function buildScanResult(resources: ScannedResource[]): ScanResult {
  return {
    source_cloud: 'gcp',
    region: 'multiple',
    resources,
    total_resources: resources.length,
    input_type: 'auto_discover',
  }
}

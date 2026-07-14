import { InstancesClient } from '@google-cloud/compute'
import { Storage } from '@google-cloud/storage'
import { google } from 'googleapis'

/**
 * Scans Compute Engine instances, Cloud Storage buckets, and Cloud SQL
 * instances in the given project, using Application Default Credentials —
 * whatever the customer already has configured locally (gcloud auth
 * application-default login, a service account key file referenced via
 * GOOGLE_APPLICATION_CREDENTIALS, or workload identity). No credentials
 * are read or transmitted by this tool.
 *
 * Only read-only list/get calls are made — never a data-plane call.
 */
export async function scanGCP(projectId) {
  const resources = []

  // --- Compute Engine instances (all zones) ---
  const instancesClient = new InstancesClient()
  const aggListRequest = instancesClient.aggregatedListAsync({ project: projectId })
  for await (const [zone, instancesInZone] of aggListRequest) {
    for (const instance of instancesInZone.instances ?? []) {
      resources.push({
        type: 'google_compute_instance',
        name: instance.name ?? 'unknown',
        cloud: 'gcp',
        region: zone.replace('zones/', ''),
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

  // --- Cloud Storage buckets ---
  const storage = new Storage({ projectId })
  const [buckets] = await storage.getBuckets()
  for (const bucket of buckets) {
    const [metadata] = await bucket.getMetadata()
    resources.push({
      type: 'google_storage_bucket',
      name: bucket.name,
      cloud: 'gcp',
      region: metadata.location ?? '',
      issues: [],
      properties: {
        public_access_prevention: metadata.iamConfiguration?.publicAccessPrevention ?? 'unknown',
        uniform_bucket_level_access: String(!!metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled),
        versioning_enabled: String(!!metadata.versioning?.enabled),
      },
    })
  }

  // --- Cloud SQL instances ---
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const authClient = await auth.getClient()
  const sqladmin = google.sqladmin({ version: 'v1beta4', auth: authClient })
  const { data } = await sqladmin.instances.list({ project: projectId })
  for (const instance of data.items ?? []) {
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

  return resources
}

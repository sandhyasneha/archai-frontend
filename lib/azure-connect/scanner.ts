import { ScannedResource, ScanResult } from '@/lib/agents/brownfield/scanner'

const ARM_BASE = 'https://management.azure.com'

async function armGet(path: string, apiVersion: string, token: string): Promise<{ value: unknown[] } | null> {
  const res = await fetch(`${ARM_BASE}${path}?api-version=${apiVersion}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ARM request failed (${res.status}) for ${path}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

interface AzureVM {
  name: string
  location: string
  properties?: {
    hardwareProfile?: { vmSize?: string }
    provisioningState?: string
    storageProfile?: { osDisk?: { encryptionSettings?: { enabled?: boolean } } }
  }
}

interface AzureStorageAccount {
  name: string
  location: string
  sku?: { name?: string }
  properties?: {
    allowBlobPublicAccess?: boolean
    supportsHttpsTrafficOnly?: boolean
  }
}

interface AzureSqlServer {
  name: string
  location: string
  properties?: {
    publicNetworkAccess?: string
    minimalTlsVersion?: string
  }
}

/**
 * Scans virtual machines, storage accounts, and SQL servers in the given
 * subscription via direct ARM REST calls, using an app-only access token
 * acquired through MSAL's Client Credentials flow. Same resource types and
 * property set as the archai-cli Azure provider, so Auditor/Planner
 * findings are consistent regardless of connection method.
 *
 * Only read (GET/list) ARM calls are made — never a data-plane call.
 */
export async function scanAzureWithToken(
  subscriptionId: string,
  token: string
): Promise<{ resources: ScannedResource[]; warnings: string[] }> {
  const resources: ScannedResource[] = []
  const warnings: string[] = []

  // --- Virtual machines ---
  try {
    const data = await armGet(`/subscriptions/${subscriptionId}/providers/Microsoft.Compute/virtualMachines`, '2024-07-01', token)
    for (const vm of (data?.value ?? []) as AzureVM[]) {
      resources.push({
        type: 'azurerm_linux_virtual_machine',
        name: vm.name ?? 'unknown',
        cloud: 'azure',
        region: vm.location ?? '',
        issues: [],
        properties: {
          vm_size: vm.properties?.hardwareProfile?.vmSize ?? '',
          os_disk_encryption_enabled: String(!!vm.properties?.storageProfile?.osDisk?.encryptionSettings?.enabled),
          provisioning_state: vm.properties?.provisioningState ?? '',
        },
      })
    }
  } catch (err) {
    warnings.push(`VM scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // --- Storage accounts ---
  try {
    const data = await armGet(`/subscriptions/${subscriptionId}/providers/Microsoft.Storage/storageAccounts`, '2023-01-01', token)
    for (const acc of (data?.value ?? []) as AzureStorageAccount[]) {
      resources.push({
        type: 'azurerm_storage_account',
        name: acc.name ?? 'unknown',
        cloud: 'azure',
        region: acc.location ?? '',
        issues: [],
        properties: {
          allow_blob_public_access: String(!!acc.properties?.allowBlobPublicAccess),
          https_traffic_only_enabled: String(!!acc.properties?.supportsHttpsTrafficOnly),
          sku: acc.sku?.name ?? '',
        },
      })
    }
  } catch (err) {
    warnings.push(`Storage account scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // --- SQL servers ---
  try {
    const data = await armGet(`/subscriptions/${subscriptionId}/providers/Microsoft.Sql/servers`, '2021-11-01', token)
    for (const server of (data?.value ?? []) as AzureSqlServer[]) {
      resources.push({
        type: 'azurerm_mssql_server',
        name: server.name ?? 'unknown',
        cloud: 'azure',
        region: server.location ?? '',
        issues: [],
        properties: {
          public_network_access: server.properties?.publicNetworkAccess ?? 'unknown',
          minimal_tls_version: server.properties?.minimalTlsVersion ?? 'unknown',
        },
      })
    }
  } catch (err) {
    warnings.push(`SQL server scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return { resources, warnings }
}

export function buildScanResult(resources: ScannedResource[]): ScanResult {
  return {
    source_cloud: 'azure',
    region: 'multiple',
    resources,
    total_resources: resources.length,
    input_type: 'auto_discover',
  }
}

import { DefaultAzureCredential } from '@azure/identity'
import { ComputeManagementClient } from '@azure/arm-compute'
import { StorageManagementClient } from '@azure/arm-storage'
import { SqlManagementClient } from '@azure/arm-sql'

/**
 * Scans virtual machines, storage accounts, and SQL servers in the given
 * subscription, using DefaultAzureCredential — which resolves to whatever
 * the customer already has configured locally (az CLI login, environment
 * variables, managed identity, etc.). No credentials are read or
 * transmitted by this tool.
 *
 * Only read-only ARM list/get calls are made — never a data-plane call.
 */
export async function scanAzure(subscriptionId) {
  const credential = new DefaultAzureCredential()
  const resources = []

  // --- Virtual machines ---
  const computeClient = new ComputeManagementClient(credential, subscriptionId)
  for await (const vm of computeClient.virtualMachines.listAll()) {
    resources.push({
      type: 'azurerm_linux_virtual_machine',
      name: vm.name ?? 'unknown',
      cloud: 'azure',
      region: vm.location ?? '',
      issues: [],
      properties: {
        vm_size: vm.hardwareProfile?.vmSize ?? '',
        os_disk_encryption_enabled: String(!!vm.storageProfile?.osDisk?.encryptionSettings?.enabled),
        provisioning_state: vm.provisioningState ?? '',
      },
    })
  }

  // --- Storage accounts ---
  const storageClient = new StorageManagementClient(credential, subscriptionId)
  for await (const account of storageClient.storageAccounts.list()) {
    resources.push({
      type: 'azurerm_storage_account',
      name: account.name ?? 'unknown',
      cloud: 'azure',
      region: account.location ?? '',
      issues: [],
      properties: {
        allow_blob_public_access: String(!!account.allowBlobPublicAccess),
        https_traffic_only_enabled: String(!!account.enableHttpsTrafficOnly),
        sku: account.sku?.name ?? '',
      },
    })
  }

  // --- SQL servers ---
  const sqlClient = new SqlManagementClient(credential, subscriptionId)
  for await (const server of sqlClient.servers.list()) {
    resources.push({
      type: 'azurerm_mssql_server',
      name: server.name ?? 'unknown',
      cloud: 'azure',
      region: server.location ?? '',
      issues: [],
      properties: {
        public_network_access: server.publicNetworkAccess ?? 'unknown',
        minimal_tls_version: server.minimalTlsVersion ?? 'unknown',
      },
    })
  }

  return resources
}

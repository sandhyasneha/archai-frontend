import { ConfidentialClientApplication } from '@azure/msal-node'
import { config } from '@/lib/config'

/**
 * Builds the admin-consent URL for ArchAI's multi-tenant Azure AD app.
 * The customer's Global Admin visits this, reviews the permissions
 * requested, and consents — which creates ArchAI's app as a Service
 * Principal inside their tenant. This step alone does NOT grant any
 * resource access; the customer must separately assign the Reader RBAC
 * role to that Service Principal in their subscription's IAM.
 */
export function buildAdminConsentUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: config.azure.client_id,
    state,
    redirect_uri: redirectUri,
  })
  return `https://login.microsoftonline.com/organizations/adminconsent?${params.toString()}`
}

/**
 * Acquires an app-only access token for Azure Resource Manager, scoped to
 * a specific customer tenant, using the OAuth2 Client Credentials flow —
 * the officially recommended MSAL pattern for unattended/daemon access
 * (see: https://learn.microsoft.com/entra/msal/dotnet/acquiring-tokens/web-apps-apis/msal-net-client-applications).
 *
 * This will only succeed if the customer has both completed admin
 * consent AND separately assigned the Reader role to ArchAI's app in
 * their subscription — otherwise Azure returns a 403 on the first real
 * ARM call, even though token acquisition itself succeeds (the token
 * proves identity, not authorization).
 */
export async function acquireManagementToken(tenantId: string): Promise<string> {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: config.azure.client_id,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret: config.azure.client_secret,
    },
  })

  const result = await cca.acquireTokenByClientCredential({
    scopes: ['https://management.azure.com/.default'],
  })

  if (!result?.accessToken) {
    throw new Error('Failed to acquire Azure management token — check tenant ID and app registration.')
  }

  return result.accessToken
}

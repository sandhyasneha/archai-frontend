import { GoogleAuth } from 'google-auth-library'
import { config } from '@/lib/config'

let cachedCredentials: Record<string, unknown> | null = null

function getCredentials(): Record<string, unknown> {
  if (!cachedCredentials) {
    cachedCredentials = JSON.parse(config.gcp.service_account_key)
  }
  return cachedCredentials!
}

/**
 * Returns ArchAI's own service account email — shown to customers so
 * they know exactly which identity to grant Viewer access to in their
 * project's IAM. Never a secret; it's the equivalent of AWS's IAM user
 * ARN or Azure's app display name.
 */
export function getServiceAccountEmail(): string {
  const creds = getCredentials()
  return (creds.client_email as string) ?? 'unknown'
}

/**
 * Builds an authenticated client for a specific customer project, using
 * ArchAI's own service account credentials. This only succeeds in
 * practice if the customer has granted that service account Viewer (or
 * equivalent) access in their project's IAM — otherwise API calls made
 * with this client return 403, even though the client itself builds
 * successfully (authentication vs. authorization, same distinction as
 * the Azure Connect flow).
 */
export async function getGcpAuthClient(projectId: string) {
  const auth = new GoogleAuth({
    credentials: getCredentials(),
    projectId,
    // Note: 'cloud-platform.read-only' has inconsistent support across
    // older GCP APIs (Compute Engine among them) — Google's own client
    // libraries default to the broader 'cloud-platform' scope even for
    // read-only use. Actual enforcement of read-only access still comes
    // entirely from the Viewer IAM role the customer grants, not from
    // this OAuth scope — this widening doesn't grant any extra ability
    // beyond what Viewer already permits.
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  return auth.getClient()
}

export async function getAccessToken(projectId: string): Promise<string> {
  const client = await getGcpAuthClient(projectId)
  const token = await client.getAccessToken()
  if (!token.token) throw new Error('Failed to acquire GCP access token')
  return token.token
}

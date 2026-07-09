import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { config } from '@/lib/config'

interface AssumedCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
}

/**
 * Assumes a customer's ArchAI-ReadOnly cross-account role, using ArchAI's
 * own limited AWS identity (which itself has no permissions beyond
 * sts:AssumeRole). Requires the customer's Role ARN and the ExternalId
 * originally generated for that connection — both must match what the
 * customer's own trust policy expects, or this fails.
 */
export async function assumeCustomerRole(roleArn: string, externalId: string): Promise<AssumedCredentials> {
  const sts = new STSClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.aws.access_key_id,
      secretAccessKey: config.aws.secret_access_key,
    },
  })

  const result = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: 'archai-brownfield-scan',
    ExternalId: externalId,
    DurationSeconds: 900, // 15 minutes — just long enough for one scan
  }))

  if (!result.Credentials?.AccessKeyId || !result.Credentials?.SecretAccessKey || !result.Credentials?.SessionToken) {
    throw new Error('AssumeRole succeeded but returned no usable credentials')
  }

  return {
    accessKeyId: result.Credentials.AccessKeyId,
    secretAccessKey: result.Credentials.SecretAccessKey,
    sessionToken: result.Credentials.SessionToken,
  }
}

/**
 * Verifies a role can genuinely be assumed with the given ExternalId,
 * without running a full scan — used when the customer first pastes back
 * their Role ARN, so a bad ARN or mismatched ExternalId fails fast with a
 * clear error instead of silently marking the connection 'active'.
 */
export async function verifyRoleAssumable(roleArn: string, externalId: string): Promise<{ ok: boolean; error?: string; assumedArn?: string }> {
  try {
    const creds = await assumeCustomerRole(roleArn, externalId)
    const sts = new STSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
    })
    const identity = await sts.send(new GetCallerIdentityCommand({}))
    return { ok: true, assumedArn: identity.Arn }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

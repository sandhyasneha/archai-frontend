import {
  EC2Client, DescribeInstancesCommand,
} from '@aws-sdk/client-ec2'
import {
  S3Client, ListBucketsCommand, GetBucketLocationCommand,
  GetPublicAccessBlockCommand, GetBucketEncryptionCommand, GetBucketVersioningCommand,
} from '@aws-sdk/client-s3'
import {
  RDSClient, DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds'
import { ScannedResource, ScanResult } from '@/lib/agents/brownfield/scanner'

interface AssumedCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
}

/**
 * Same discovery logic as the archai-cli AWS provider (see archai-cli/src/providers/aws.js),
 * ported to run server-side against assumed cross-account credentials instead
 * of a local default credential chain. Carries over the same fixes already
 * proven against a real AWS account: per-bucket region resolution (bucket
 * config APIs require the bucket's actual region, not just the requested
 * one), distinguishing "not configured" from genuine access errors, and
 * per-resource-type resilience (one failing resource type doesn't abort
 * the whole scan).
 */
export async function scanAWSWithAssumedRole(
  region: string,
  creds: AssumedCredentials
): Promise<{ resources: ScannedResource[]; warnings: string[] }> {
  const resources: ScannedResource[] = []
  const warnings: string[] = []
  const credentials = {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
  }

  // --- EC2 instances ---
  try {
    const ec2 = new EC2Client({ region, credentials })
    const ec2Data = await ec2.send(new DescribeInstancesCommand({}))
    for (const reservation of ec2Data.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        const nameTag = instance.Tags?.find((t) => t.Key === 'Name')?.Value
        resources.push({
          type: 'aws_instance',
          name: nameTag || instance.InstanceId || 'unknown',
          cloud: 'aws',
          region,
          issues: [],
          properties: {
            instance_id: instance.InstanceId ?? '',
            instance_type: instance.InstanceType ?? '',
            state: instance.State?.Name ?? '',
            public_ip_assigned: String(!!instance.PublicIpAddress),
            monitoring: instance.Monitoring?.State ?? '',
            iam_instance_profile: instance.IamInstanceProfile?.Arn ?? 'none',
          },
        })
      }
    }
  } catch (err) {
    warnings.push(`EC2 scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // --- S3 buckets ---
  try {
    const s3 = new S3Client({ region, credentials })
    const bucketsData = await s3.send(new ListBucketsCommand({}))
    const regionClientCache = new Map<string, S3Client>([[region, s3]])

    for (const bucket of bucketsData.Buckets ?? []) {
      const name = bucket.Name
      if (!name) continue
      let publicAccessBlocked = 'unknown'
      let encrypted = 'unknown'
      let versioning = 'unknown'
      let bucketRegion = region

      try {
        const loc = await s3.send(new GetBucketLocationCommand({ Bucket: name }))
        bucketRegion = loc.LocationConstraint || 'us-east-1'
      } catch (err) {
        warnings.push(`Could not determine region for bucket ${name}, assuming ${region}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      let regionalClient = regionClientCache.get(bucketRegion)
      if (!regionalClient) {
        regionalClient = new S3Client({ region: bucketRegion, credentials })
        regionClientCache.set(bucketRegion, regionalClient)
      }

      try {
        const pab = await regionalClient.send(new GetPublicAccessBlockCommand({ Bucket: name }))
        const cfg = pab.PublicAccessBlockConfiguration
        publicAccessBlocked = String(!!(cfg?.BlockPublicAcls && cfg?.BlockPublicPolicy))
      } catch (err) {
        const e = err as { name?: string; message?: string }
        if (e.name === 'NoSuchPublicAccessBlockConfiguration') {
          publicAccessBlocked = 'false'
        } else {
          warnings.push(`Could not read public access block for bucket ${name}: ${e.message ?? 'Unknown error'}`)
        }
      }
      try {
        await regionalClient.send(new GetBucketEncryptionCommand({ Bucket: name }))
        encrypted = 'true'
      } catch (err) {
        const e = err as { name?: string; message?: string }
        if (e.name === 'ServerSideEncryptionConfigurationNotFoundError') {
          encrypted = 'false'
        } else {
          warnings.push(`Could not read encryption config for bucket ${name}: ${e.message ?? 'Unknown error'}`)
        }
      }
      try {
        const v = await regionalClient.send(new GetBucketVersioningCommand({ Bucket: name }))
        versioning = v.Status ?? 'Disabled'
      } catch (err) {
        warnings.push(`Could not read versioning for bucket ${name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      resources.push({
        type: 'aws_s3_bucket',
        name,
        cloud: 'aws',
        region: bucketRegion,
        issues: [],
        properties: {
          public_access_blocked: publicAccessBlocked,
          encrypted,
          versioning,
        },
      })
    }
  } catch (err) {
    warnings.push(`S3 scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // --- RDS instances ---
  try {
    const rds = new RDSClient({ region, credentials })
    const rdsData = await rds.send(new DescribeDBInstancesCommand({}))
    for (const db of rdsData.DBInstances ?? []) {
      resources.push({
        type: 'aws_db_instance',
        name: db.DBInstanceIdentifier ?? 'unknown',
        cloud: 'aws',
        region,
        issues: [],
        properties: {
          engine: db.Engine ?? '',
          engine_version: db.EngineVersion ?? '',
          instance_class: db.DBInstanceClass ?? '',
          publicly_accessible: String(!!db.PubliclyAccessible),
          storage_encrypted: String(!!db.StorageEncrypted),
          multi_az: String(!!db.MultiAZ),
        },
      })
    }
  } catch (err) {
    warnings.push(`RDS scan skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return { resources, warnings }
}

export function buildScanResult(region: string, resources: ScannedResource[]): ScanResult {
  return {
    source_cloud: 'aws',
    region,
    resources,
    total_resources: resources.length,
    input_type: 'auto_discover',
  }
}

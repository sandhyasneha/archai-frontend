import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
} from '@aws-sdk/client-s3'
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds'

/**
 * Scans EC2 instances, S3 buckets, and RDS instances in the given region,
 * using the AWS SDK's default credential provider chain — the same
 * credentials already configured via `aws configure`, environment
 * variables, or an assumed role. No credentials are read or transmitted
 * by this tool; the SDK resolves them locally and calls AWS directly.
 *
 * Only read-only, metadata-plane API calls are made ("Describe", "List",
 * and "Get config" style calls) — never a data-plane call that would read
 * actual stored data (e.g. S3 object contents, database rows).
 */
export async function scanAWS(region) {
  const resources = []

  // --- EC2 instances ---
  const ec2 = new EC2Client({ region })
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

  // --- S3 buckets ---
  const s3 = new S3Client({ region })
  const bucketsData = await s3.send(new ListBucketsCommand({}))
  for (const bucket of bucketsData.Buckets ?? []) {
    const name = bucket.Name
    let publicAccessBlocked = 'unknown'
    let encrypted = 'unknown'
    let versioning = 'unknown'

    try {
      const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: name }))
      const cfg = pab.PublicAccessBlockConfiguration
      publicAccessBlocked = String(!!(cfg?.BlockPublicAcls && cfg?.BlockPublicPolicy))
    } catch {
      // No public access block configuration set — leave as 'unknown'
    }
    try {
      await s3.send(new GetBucketEncryptionCommand({ Bucket: name }))
      encrypted = 'true'
    } catch {
      encrypted = 'false'
    }
    try {
      const v = await s3.send(new GetBucketVersioningCommand({ Bucket: name }))
      versioning = v.Status ?? 'Disabled'
    } catch {
      // ignore
    }

    resources.push({
      type: 'aws_s3_bucket',
      name: name ?? 'unknown',
      cloud: 'aws',
      region,
      issues: [],
      properties: {
        public_access_blocked: publicAccessBlocked,
        encrypted,
        versioning,
      },
    })
  }

  // --- RDS instances ---
  const rds = new RDSClient({ region })
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

  return resources
}

# ArchAI CLI

Local, read-only cloud resource discovery for [ArchAI](https://arch.nexplan.io) Brownfield auto-discover.

## What this is

Instead of manually exporting and pasting your Terraform, this tool scans your
existing AWS, Azure, or GCP resources directly and submits the results to
ArchAI for security audit, cost analysis, and migration planning.

## Security model

- **Runs entirely on your machine.** This tool calls your cloud provider's own
  APIs directly, using your own already-configured credentials — the same
  credential chain `aws-cli`, `az cli`, or `terraform` already use.
- **Never reads, stores, or transmits your cloud credentials.** ArchAI's
  servers never see them. The CLI only sends the *results* of the scan
  (resource types and configuration), authenticated with a separate ArchAI
  API key — not your cloud credentials.
- **Only read-only, metadata-plane API calls are made** — `Describe*`,
  `List*`, `Get*Config` style calls. This tool never calls a data-plane API
  that would read actual stored data (e.g. S3 object contents, database
  rows, VM disk contents).
- **Open source and inspectable.** You (or your security team) can read
  exactly what this tool does before running it — there's no hidden
  behaviour.

## ⚠️ Status: written against official SDK documentation, not yet
## verified against live cloud accounts

This CLI was built by reading the official, current API surface of the AWS
SDK v3, Azure SDK for JS, and Google Cloud client libraries — the same
packages any developer would install from npm. It has **not** been run
against a real AWS, Azure, or GCP account yet. Before relying on it:

1. Run it with `--dry-run` first against a **non-production** account or a
   dedicated test account, and inspect the JSON output.
2. Confirm the discovered resource counts and properties match what you
   expect.
3. Only then run it against production, and only with a read-only IAM
   principal (see below).

## Installation

```bash
npm install -g archai-cli
# or, from a local clone:
npm install
npm link
```

## Required permissions

Create a dedicated, read-only credential for this tool. Do not use an
administrator credential.

### AWS (IAM policy)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "s3:ListAllMyBuckets",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetEncryptionConfiguration",
        "s3:GetBucketVersioning",
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

### Azure (built-in role)

Assign the built-in **Reader** role at the subscription or resource group
scope. This grants read access to resource configuration without any
ability to read data or make changes.

### GCP (predefined role)

Grant `roles/viewer` at the project level, or for tighter scope, combine:
`roles/compute.viewer`, `roles/storage.objectViewer` (metadata only, not
object contents), and `roles/cloudsql.viewer`.

## Usage

```bash
# Get your ArchAI API key first: Settings -> API Keys -> Generate key

# Scan an AWS account, targeting AWS for the migration plan
archai-cli scan --source aws --target aws --region us-east-1 --api-key archai_live_...

# Scan Azure, plan a migration to AWS
archai-cli scan --source azure --target aws --subscription 00000000-0000-0000-0000-000000000000 --api-key archai_live_...

# Scan GCP, and just inspect the output locally without sending it anywhere
archai-cli scan --source gcp --target gcp --project my-gcp-project --dry-run
```

## What gets discovered today

| Cloud | Resources |
|---|---|
| AWS | EC2 instances, S3 buckets, RDS instances |
| Azure | Virtual machines, storage accounts, SQL servers |
| GCP | Compute Engine instances, Cloud Storage buckets, Cloud SQL instances |

This is an initial resource set, not exhaustive. Extending coverage (VPCs,
IAM policies, load balancers, etc.) is a natural next step once this is
validated against real accounts.

## License

MIT

#!/usr/bin/env node
import { scanAWS } from '../src/providers/aws.js'
import { scanAzure } from '../src/providers/azure.js'
import { scanGCP } from '../src/providers/gcp.js'

const DEFAULT_ENDPOINT = 'https://arch.nexplan.io/api/brownfield/ingest'

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }
    } else {
      args._.push(arg)
    }
  }
  return args
}

function printHelp() {
  console.log(`
ArchAI CLI — local, read-only cloud resource discovery for Brownfield auto-discover.

This tool runs entirely on your machine, using your own existing cloud
credentials (aws configure / az login / gcloud auth). It never reads or
transmits your credentials — it calls your cloud provider's own read-only
APIs directly, then sends only the resulting resource metadata to ArchAI.

Usage:
  archai-cli scan --source <aws|azure|gcp> --target <aws|azure|gcp> --api-key <key> [options]

Required:
  --source        Cloud to scan: aws, azure, or gcp
  --target        Cloud to generate a migration plan toward (can differ from --source)
  --api-key       Your ArchAI API key (Settings -> API Keys)

Cloud-specific (one required, matching --source):
  --region        AWS region, e.g. us-east-1
  --subscription  Azure subscription ID
  --project       GCP project ID

Optional:
  --endpoint      Override the ArchAI ingest URL (default: ${DEFAULT_ENDPOINT})
  --dry-run       Scan and print the result locally without sending it anywhere

Examples:
  archai-cli scan --source aws --target aws --region us-east-1 --api-key archai_live_...
  archai-cli scan --source azure --target aws --subscription 00000000-... --api-key archai_live_...
  archai-cli scan --source gcp --target gcp --project my-gcp-project --api-key archai_live_... --dry-run
`)
}

async function main() {
  const argv = process.argv.slice(2)
  const command = argv[0]
  const args = parseArgs(argv.slice(1))

  if (command !== 'scan' || args.help) {
    printHelp()
    process.exit(command === 'scan' ? 0 : 1)
  }

  const { source, target, region, subscription, project, 'api-key': apiKey, endpoint, 'dry-run': dryRun } = args

  if (!source || !['aws', 'azure', 'gcp'].includes(source)) {
    console.error('Error: --source must be one of: aws, azure, gcp')
    process.exit(1)
  }
  if (!target || !['aws', 'azure', 'gcp'].includes(target)) {
    console.error('Error: --target must be one of: aws, azure, gcp')
    process.exit(1)
  }
  if (!dryRun && !apiKey) {
    console.error('Error: --api-key is required (generate one in ArchAI Settings -> API Keys), or pass --dry-run')
    process.exit(1)
  }

  if (source === 'aws' && !region) {
    console.error('Error: --region is required for --source aws')
    process.exit(1)
  }
  if (source === 'azure' && !subscription) {
    console.error('Error: --subscription is required for --source azure')
    process.exit(1)
  }
  if (source === 'gcp' && !project) {
    console.error('Error: --project is required for --source gcp')
    process.exit(1)
  }

  console.log(`Scanning ${source} resources... (this calls your cloud provider's APIs directly, from this machine)`)

  let resources = []
  let region_used = ''

  try {
    if (source === 'aws') {
      region_used = region
      resources = await scanAWS(region)
    } else if (source === 'azure') {
      region_used = 'multiple' // Azure resources can span regions within one subscription
      resources = await scanAzure(subscription)
    } else if (source === 'gcp') {
      region_used = 'multiple'
      resources = await scanGCP(project)
    }
  } catch (err) {
    console.error(`Scan failed: ${err.message}`)
    console.error('Check that your local credentials are configured and have read-only permissions for the resource types above.')
    process.exit(1)
  }

  const scanResult = {
    source_cloud: source,
    region: region_used,
    resources,
    total_resources: resources.length,
    input_type: 'auto_discover',
  }

  console.log(`Found ${resources.length} resource(s).`)

  if (dryRun) {
    console.log(JSON.stringify(scanResult, null, 2))
    return
  }

  const url = endpoint || DEFAULT_ENDPOINT
  console.log(`Submitting to ${url}...`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ target_cloud: target, scan_result: scanResult }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error(`ArchAI rejected the scan: ${data.error || res.statusText}`)
    if (data.message) console.error(data.message)
    process.exit(1)
  }

  console.log('\nMigration analysis complete.')
  console.log(`  Compliance score: ${data.compliance_score}/100`)
  console.log(`  Findings: ${data.findings_count}`)
  console.log(`  ADR: ${data.adr_id}`)
  console.log(`  View: ${data.url}`)
}

main().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})

export const config = {
  anthropic: {
    api_key: process.env.ANTHROPIC_API_KEY!,
  },
  resend: {
    api_key: process.env.RESEND_API_KEY!,
    from: process.env.RESEND_FROM_EMAIL || 'ArchAI <info@nexplan.io>',
  },
  cron: {
    secret: process.env.CRON_SECRET!,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
  },
  aws: {
    // ArchAI's own AWS identity, used ONLY to call sts:AssumeRole into a
    // customer's cross-account role. This identity itself should have no
    // permissions in its own account beyond sts:AssumeRole — all actual
    // read access comes from the role the customer creates and controls.
    access_key_id: process.env.ARCHAI_AWS_ACCESS_KEY_ID!,
    secret_access_key: process.env.ARCHAI_AWS_SECRET_ACCESS_KEY!,
    account_id: process.env.ARCHAI_AWS_ACCOUNT_ID!,
  },
  azure: {
    // ArchAI's own multi-tenant Azure AD app registration. Admin consent
    // creates this app's Service Principal in the customer's tenant, but
    // that alone grants no resource access — the customer must separately
    // assign the Reader RBAC role to it in their subscription's IAM.
    client_id: process.env.ARCHAI_AZURE_CLIENT_ID!,
    client_secret: process.env.ARCHAI_AZURE_CLIENT_SECRET!,
    tenant_id: process.env.ARCHAI_AZURE_TENANT_ID!,
  },
  gcp: {
    // ArchAI's own GCP service account key (the full JSON key file
    // content, pasted as-is into this env var). This identity itself
    // has no project access by default — the customer must add its
    // email as a Viewer in their own project's IAM for scans to work.
    service_account_key: process.env.ARCHAI_GCP_SERVICE_ACCOUNT_KEY!,
  },
}

// Blocked personal email domains
export const BLOCKED_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
  'yandex.com', 'zoho.com', 'live.com', 'msn.com',
  'me.com', 'mac.com', 'inbox.com', 'gmx.com',
  'tutanota.com', 'fastmail.com', 'hushmail.com',
])

export function isPersonalDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? BLOCKED_DOMAINS.has(domain) : true
}
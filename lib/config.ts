export const config = {
  anthropic: {
    api_key: process.env.ANTHROPIC_API_KEY!,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
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
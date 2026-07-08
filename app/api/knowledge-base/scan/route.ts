import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runKBAuditor } from '@/lib/agents/kb-auditor'
import { z } from 'zod'

const Schema = z.object({
  content: z.string().min(1).max(50000),
  filename: z.string(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { content, filename } = parsed.data

  // Only Terraform templates carry replicable IaC security risk — other KB
  // document types (compliance PDFs, naming convention docs) pass through.
  if (!filename.endsWith('.tf')) {
    return Response.json({ blocked: false, issues: [] })
  }

  try {
    const result = await runKBAuditor(content)
    return Response.json(result)
  } catch (err) {
    console.error('KB auditor failed:', err)
    // Fail open rather than blocking uploads if the scan itself errors.
    return Response.json({ blocked: false, issues: [] })
  }
}

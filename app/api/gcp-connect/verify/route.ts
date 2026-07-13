import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/gcp-connect/auth'
import { z } from 'zod'

const Schema = z.object({
  project_id: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { project_id } = parsed.data

  try {
    const token = await getAccessToken(project_id)

    // Lightweight real call — if Viewer wasn't granted, this fails with
    // 403 even though token acquisition (identity) succeeded.
    const res = await fetch(
      `https://compute.googleapis.com/compute/v1/projects/${project_id}/aggregated/instances`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      return Response.json({
        error: 'Could not read resources in this project',
        message: bodyText.slice(0, 300),
        hint: 'Confirm the Viewer role was granted to ArchAI\u2019s service account in this project\u2019s IAM, and that the Project ID is correct.',
      }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('gcp_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', project_id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('gcp_connections')
        .update({ status: 'active', verified_at: new Date().toISOString() })
        .eq('id', existing.id)
      return Response.json({ ok: true, connection_id: existing.id })
    }

    const { data: created, error } = await supabase
      .from('gcp_connections')
      .insert({ user_id: user.id, project_id, status: 'active', verified_at: new Date().toISOString() })
      .select('id')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true, connection_id: created.id })
  } catch (err) {
    return Response.json({
      error: 'Verification failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 400 })
  }
}

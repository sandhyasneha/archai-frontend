import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-keys'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ keys: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { fullKey, keyPrefix, keyHash } = generateApiKey()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
    })
    .select('id, name, key_prefix, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // The full key is only ever returned once, at creation time.
  return Response.json({ key: data, full_key: fullKey })
}

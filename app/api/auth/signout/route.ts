import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const url = new URL('/signin', request.url)
  return NextResponse.redirect(url, { status: 303 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const url = new URL('/signin', request.url)
  return NextResponse.redirect(url, { status: 303 })
}
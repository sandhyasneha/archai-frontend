import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/support/list
 * Admin-only. Returns all tickets, newest first, for the Support Triage tab.
 * Uses the service-role client so admins see every user's tickets,
 * bypassing the user-scoped RLS policies defined in the migration.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.authorized) {
      return NextResponse.json({ error: admin.message }, { status: admin.status });
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ tickets: data });
  } catch (err: any) {
    console.error('List tickets error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load tickets.' }, { status: 500 });
  }
}

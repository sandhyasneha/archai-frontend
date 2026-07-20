import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Matches the existing admin check used for /admin and /api/admin/contacts:
 * a row in `admin_users` keyed by the authenticated user's id, looked up
 * with the service-role client (bypasses RLS).
 *
 * Throws a Response-like error object with a `status` if the caller isn't
 * a signed-in admin — callers should catch this and return it directly.
 *
 * Usage in a route handler:
 *   const admin = await requireAdmin(req);
 *   if (admin instanceof NextResponse) return admin; // not authorized
 */
export async function requireAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // no-op: API routes don't need to write cookies back for this check
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false as const, status: 401, message: 'Not signed in.' };
  }

  const { data: adminRow } = await supabaseServiceRole
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!adminRow) {
    return { authorized: false as const, status: 403, message: 'Not an admin.' };
  }

  return { authorized: true as const, userId: user.id };
}

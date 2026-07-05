import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: adminUser } = await serviceClient
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!adminUser) redirect('/dashboard')

  const [
    { data: authData },
    { data: users },
    { data: blueprints },
    { data: subscriptions },
    { data: plans },
    { data: usageLogs },
  ] = await Promise.all([
    serviceClient.auth.admin.listUsers(),
    serviceClient.from('users').select('*').order('created_at', { ascending: false }),
    serviceClient.from('blueprints').select('id, user_id, arch_plan, audit_result, created_at').order('created_at', { ascending: false }),
    serviceClient.from('subscriptions').select('*, plans(*)'),
    serviceClient.from('plans').select('*').order('price_monthly', { ascending: true }),
    serviceClient.from('usage_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <AdminDashboardClient
      adminEmail={user.email ?? ''}
      users={users ?? []}
      blueprints={blueprints ?? []}
      subscriptions={subscriptions ?? []}
      plans={plans ?? []}
      usageLogs={usageLogs ?? []}
      authUsers={authData?.users ?? []}
    />
  )
}
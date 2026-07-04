import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Check admin access
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!adminUser) redirect('/dashboard')

  // Use service role client for admin operations
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch auth users using service role
  const { data: authData } = await serviceClient.auth.admin.listUsers()

  // Fetch all data
  const { data: users } = await serviceClient
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: blueprints } = await serviceClient
    .from('blueprints')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: subscriptions } = await serviceClient
    .from('subscriptions')
    .select('*, plans(*)')

  const { data: plans } = await serviceClient
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  const { data: usageLogs } = await serviceClient
    .from('usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

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
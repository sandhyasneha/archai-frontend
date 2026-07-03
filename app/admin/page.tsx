import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  // Fetch all users with subscriptions
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all blueprints
  const { data: blueprints } = await supabase
    .from('blueprints')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch subscriptions with plan info
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')

  // Fetch plans
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  // Fetch usage logs
  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch auth users for additional info
  const { data: authData } = await supabase.auth.admin.listUsers()

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
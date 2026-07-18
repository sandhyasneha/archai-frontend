'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  full_name: string
  created_at: string
}

interface Blueprint {
  id: string
  user_id: string
  arch_plan: { provider: string }
  audit_result: string
  created_at: string
}

interface Plan {
  id: string
  name: string
  display_name: string
  price_monthly: number
  blueprint_limit: number
}

interface Subscription {
  id: string
  user_id: string
  status: string
  billing_cycle: string
  blueprints_used: number
  expires_at: string
  started_at: string
  plans: Plan
}

interface UsageLog {
  id: string
  user_id: string
  agent?: string
  tokens_in: number
  tokens_out: number
  cost_usd: number
  created_at: string
}

interface AuthUser {
  id: string
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  created_at: string
  user_metadata?: { full_name?: string; org_name?: string }
}

interface ContactSubmission {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
  plan_interest: string
  message: string
  status: string
  created_at: string
}

interface Props {
  adminEmail: string
  users: User[]
  blueprints: Blueprint[]
  subscriptions: Subscription[]
  plans: Plan[]
  usageLogs: UsageLog[]
  authUsers: AuthUser[]
}

type AdminTab = 'overview' | 'users' | 'usage' | 'plans' | 'contacts'

const planCounts = (plans: Plan[], subscriptions: Subscription[]) =>
  plans.map(p => ({
    ...p,
    count: subscriptions.filter(s => s.plans?.id === p.id).length,
  }))

export default function AdminDashboardClient({
  adminEmail, users, blueprints, subscriptions, plans, usageLogs, authUsers
}: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [toast, setToast] = useState('')
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  // Users tab state
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const USERS_PER_PAGE = 5

  // Overview tab — Recent signups pagination
  const [signupsPage, setSignupsPage] = useState(1)
  const SIGNUPS_PER_PAGE = 8

  // Contacts tab state
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [contactPage, setContactPage] = useState(1)
  const [contactLoading, setContactLoading] = useState(false)
  const CONTACTS_PER_PAGE = 10

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  
useEffect(() => {
  loadContacts()
}, [])

useEffect(() => {
  if (activeTab === 'contacts') loadContacts()
}, [activeTab])


  async function loadContacts() {
  setContactLoading(true)
  const res = await fetch('/api/admin/contacts')
  const data = await res.json()
  setContacts(Array.isArray(data) ? data : [])
  setContactLoading(false)
}

async function deleteContact(id: string) {
  await fetch('/api/admin/contacts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  setContacts(prev => prev.filter(c => c.id !== id))
  showToast('Contact deleted')
}

 
  async function updateContactStatus(id: string, status: string) {
    await supabase.from('contact_submissions').update({ status }).eq('id', id)
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    showToast('Status updated')
  }

  async function changePlan(userId: string, planId: string, planName: string) {
    setUpdatingUser(userId)
    const { error } = await supabase
      .from('subscriptions')
      .upsert({ user_id: userId, plan_id: planId, status: 'active', blueprints_used: 0 }, { onConflict: 'user_id' })
    if (error) showToast('Failed: ' + error.message)
    else { showToast(`Plan updated to ${planName}`); setTimeout(() => window.location.reload(), 1500) }
    setUpdatingUser(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/signin'
  }

  // Stats
  const totalUsers = authUsers.length
  const verifiedUsers = authUsers.filter(u => u.email_confirmed_at).length
  const totalBlueprints = blueprints.length
  const totalCogs = usageLogs.reduce((sum, l) => sum + Number(l.cost_usd), 0)
  const totalTokensIn = usageLogs.reduce((sum, l) => sum + (l.tokens_in || 0), 0)
  const totalTokensOut = usageLogs.reduce((sum, l) => sum + (l.tokens_out || 0), 0)
  const mrr = subscriptions.reduce((sum, s) => {
    if (s.status === 'active' && s.plans) {
      return sum + (s.billing_cycle === 'yearly' ? s.plans.price_monthly * 0.83 : s.plans.price_monthly)
    }
    return sum
  }, 0)

  const pc = planCounts(plans, subscriptions)

  function getUserSub(userId: string) {
    return subscriptions.find(s => s.user_id === userId)
  }

  function getUserBlueprints(userId: string) {
    return blueprints.filter(b => b.user_id === userId).length
  }

  function getCountryFromEmail(email?: string): string {
    if (!email) return '—'
    const domain = email.split('@')[1]
    if (domain?.endsWith('.in')) return '🇮🇳 India'
    if (domain?.endsWith('.co.id')) return '🇮🇩 Indonesia'
    return '🌐 Global'
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: `Users (${totalUsers})` },
    { id: 'usage', label: 'Usage & COGS' },
    { id: 'plans', label: 'Plans' },
    { id: 'contacts', label: 'Contact forms' },
  ]

  // Filtered users for search
  const filteredUsers = authUsers.filter(u =>
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.user_metadata?.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.user_metadata?.org_name?.toLowerCase().includes(userSearch.toLowerCase())
  )
  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  const totalContactPages = Math.ceil(contacts.length / CONTACTS_PER_PAGE)
  const totalSignupsPages = Math.max(1, Math.ceil(authUsers.length / SIGNUPS_PER_PAGE))

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-semibold">ADMIN</span>
        </div>
        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">Admin</p>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors w-full text-left',
                activeTab === tab.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black'
              ].join(' ')}
            >
              {tab.id === 'overview' && '▦'}
              {tab.id === 'users' && '👥'}
              {tab.id === 'usage' && '📊'}
              {tab.id === 'plans' && '💳'}
              {tab.id === 'contacts' && '📬'}
              <span className="ml-1">{tab.label}</span>
            </button>
          ))}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pb-1">App</p>
            <a href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
              ← Back to app
            </a>
          </div>
        </div>
        <div className="px-3 py-3.5 border-t border-gray-100">
          <div className="text-xs font-medium text-black truncate">{adminEmail}</div>
          <div className="text-[11px] text-red-500 font-medium">Admin access</div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            Admin / <span className="text-black font-medium capitalize">{activeTab}</span>
          </div>
          <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-7">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <h1 className="text-xl font-medium text-black mb-1">Admin overview</h1>
              <p className="text-sm text-gray-400 mb-7">Platform metrics and health at a glance.</p>

              <div className="grid grid-cols-4 gap-3.5 mb-7">
                {[
                  { label: 'Total users', value: totalUsers.toString(), sub: `${verifiedUsers} verified` },
                  { label: 'Blueprints generated', value: totalBlueprints.toString(), sub: 'All time' },
                  { label: 'Est. MRR', value: `$${mrr.toFixed(0)}`, sub: 'Monthly recurring' },
                  { label: 'Total COGS', value: `$${totalCogs.toFixed(4)}`, sub: 'AI token costs' },
                ].map(s => (
                  <div key={s.label} className="border border-gray-100 rounded-xl p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{s.label}</div>
                    <div className="text-3xl font-medium text-black tracking-tight mb-1">{s.value}</div>
                    <div className="text-[11px] text-gray-400">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-5 mb-7">
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <span className="text-sm font-semibold text-black">Plan distribution</span>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    {pc.map(p => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-black">{p.display_name}</span>
                            <span className="text-xs text-gray-400">{p.count} users</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                            <div className="h-full bg-black rounded" style={{ width: totalUsers > 0 ? `${(p.count / totalUsers) * 100}%` : '0%' }} />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-black w-16 text-right">${p.price_monthly}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <span className="text-sm font-semibold text-black">Token usage</span>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    {[
                      { label: 'Total tokens in', value: totalTokensIn.toLocaleString() },
                      { label: 'Total tokens out', value: totalTokensOut.toLocaleString() },
                      { label: 'Total API cost', value: `$${totalCogs.toFixed(6)}` },
                      { label: 'Avg cost/blueprint', value: totalBlueprints > 0 ? `$${(totalCogs / totalBlueprints).toFixed(4)}` : '$0' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{item.label}</span>
                        <span className="text-sm font-medium text-black">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent signups */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <span className="text-sm font-semibold text-black">Recent signups</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">User</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Country</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Blueprints</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authUsers.slice((signupsPage - 1) * SIGNUPS_PER_PAGE, signupsPage * SIGNUPS_PER_PAGE).map(u => {
                      const sub = getUserSub(u.id)
                      return (
                        <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="font-medium text-black">{u.user_metadata?.full_name || u.email?.split('@')[0]}</div>
                            <div className="text-gray-400">{u.email}</div>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{getCountryFromEmail(u.email)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              sub?.plans?.name === 'enterprise' ? 'bg-purple-50 text-purple-700' :
                              sub?.plans?.name === 'team' ? 'bg-blue-50 text-blue-700' :
                              sub?.plans?.name === 'pro' ? 'bg-green-50 text-green-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {sub?.plans?.display_name || 'Scout'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{getUserBlueprints(u.id)}</td>
                          <td className="px-5 py-3 text-gray-400">
                            {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {authUsers.length > SIGNUPS_PER_PAGE && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                    <div className="text-xs text-gray-400">
                      Showing {Math.min((signupsPage - 1) * SIGNUPS_PER_PAGE + 1, authUsers.length)}–{Math.min(signupsPage * SIGNUPS_PER_PAGE, authUsers.length)} of {authUsers.length} users
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSignupsPage(1)} disabled={signupsPage === 1} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">First</button>
                      <button onClick={() => setSignupsPage(p => p - 1)} disabled={signupsPage === 1} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Prev</button>
                      {Array.from({ length: totalSignupsPages }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={() => setSignupsPage(page)} className={`px-2.5 py-1.5 text-xs border rounded-md ${signupsPage === page ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}>{page}</button>
                      ))}
                      <button onClick={() => setSignupsPage(p => p + 1)} disabled={signupsPage === totalSignupsPages} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Next</button>
                      <button onClick={() => setSignupsPage(totalSignupsPages)} disabled={signupsPage === totalSignupsPages} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Last</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <div>
              <h1 className="text-xl font-medium text-black mb-1">User management</h1>
              <p className="text-sm text-gray-400 mb-5">Manage plans, monitor usage, and control access.</p>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by name, email or organisation..."
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">User</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Country</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Verified</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Blueprints</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last login</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Change plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers
                      .slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE)
                      .map(u => {
                        const sub = getUserSub(u.id)
                        return (
                          <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <td className="px-5 py-3.5">
                              <div className="font-medium text-black">{u.user_metadata?.full_name || '—'}</div>
                              <div className="text-gray-400">{u.email}</div>
                              <div className="text-gray-400 mt-0.5">{u.user_metadata?.org_name || '—'}</div>
                            </td>
                            <td className="px-5 py-3.5 text-gray-600">{getCountryFromEmail(u.email)}</td>
                            <td className="px-5 py-3.5">
                              {u.email_confirmed_at
                                ? <span className="text-green-600 font-medium">✓ Yes</span>
                                : <span className="text-red-400">✗ No</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                sub?.plans?.name === 'enterprise' ? 'bg-purple-50 text-purple-700' :
                                sub?.plans?.name === 'team' ? 'bg-blue-50 text-blue-700' :
                                sub?.plans?.name === 'pro' ? 'bg-green-50 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {sub?.plans?.display_name || 'Scout'}
                              </span>
                              {sub?.expires_at && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  Exp: {new Date(sub.expires_at).toLocaleDateString('en-GB')}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-gray-600">
                              {getUserBlueprints(u.id)}
                              {sub && sub.plans?.blueprint_limit > 0 && (
                                <span className="text-gray-400"> / {sub.plans.blueprint_limit}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-gray-400">
                              {u.last_sign_in_at
                                ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                : '—'}
                            </td>
                            <td className="px-5 py-3.5">
                              <select
                                disabled={updatingUser === u.id}
                                defaultValue={sub?.plans?.id || ''}
                                onChange={async e => {
                                  const p = plans.find(p => p.id === e.target.value)
                                  if (p) await changePlan(u.id, p.id, p.display_name)
                                }}
                                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-black cursor-pointer disabled:opacity-50"
                              >
                                <option value="">Select plan</option>
                                {plans.map(p => (
                                  <option key={p.id} value={p.id}>{p.display_name} ${p.price_monthly}/mo</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Showing {Math.min((userPage - 1) * USERS_PER_PAGE + 1, filteredUsers.length)}–{Math.min(userPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setUserPage(1)} disabled={userPage === 1} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">First</button>
                  <button onClick={() => setUserPage(p => p - 1)} disabled={userPage === 1} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Prev</button>
                  {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setUserPage(page)} className={`px-2.5 py-1.5 text-xs border rounded-md ${userPage === page ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}>{page}</button>
                  ))}
                  <button onClick={() => setUserPage(p => p + 1)} disabled={userPage === totalUserPages} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Next</button>
                  <button onClick={() => setUserPage(totalUserPages)} disabled={userPage === totalUserPages} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Last</button>
                </div>
              </div>
            </div>
          )}

          {/* USAGE */}
          {activeTab === 'usage' && (
            <div>
              <h1 className="text-xl font-medium text-black mb-1">Usage &amp; COGS</h1>
              <p className="text-sm text-gray-400 mb-7">Monitor token consumption and AI costs per user.</p>

              <div className="grid grid-cols-3 gap-3.5 mb-7">
                {[
                  { label: 'Total tokens consumed', value: (totalTokensIn + totalTokensOut).toLocaleString() },
                  { label: 'Total COGS', value: `$${totalCogs.toFixed(6)}` },
                  { label: 'Avg COGS per blueprint', value: totalBlueprints > 0 ? `$${(totalCogs / totalBlueprints).toFixed(4)}` : '$0.00' },
                ].map(s => (
                  <div key={s.label} className="border border-gray-100 rounded-xl p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{s.label}</div>
                    <div className="text-2xl font-medium text-black">{s.value}</div>
                  </div>
                ))}
              </div>

              {usageLogs.length === 0 ? (
                <div className="border border-gray-100 rounded-xl p-12 text-center">
                  <div className="text-3xl text-gray-200 mb-3">📊</div>
                  <div className="text-sm font-medium text-black mb-1">No usage data yet</div>
                  <p className="text-xs text-gray-400">Usage logs will appear here once users generate blueprints.</p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">User</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Agent</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tokens in</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tokens out</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cost USD</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageLogs.map(log => {
                        const u = authUsers.find(u => u.id === log.user_id)
                        return (
                          <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <td className="px-5 py-3 text-gray-600">{u?.email || log.user_id.slice(0, 8)}</td>
                            <td className="px-5 py-3 text-gray-600 font-mono">{log.agent || '—'}</td>
                            <td className="px-5 py-3 text-gray-600">{log.tokens_in?.toLocaleString() || '—'}</td>
                            <td className="px-5 py-3 text-gray-600">{log.tokens_out?.toLocaleString() || '—'}</td>
                            <td className="px-5 py-3 text-gray-600">${Number(log.cost_usd).toFixed(6)}</td>
                            <td className="px-5 py-3 text-gray-400">
                              {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PLANS */}
          {activeTab === 'plans' && (
            <div>
              <h1 className="text-xl font-medium text-black mb-1">Plan management</h1>
              <p className="text-sm text-gray-400 mb-7">Current pricing tiers and feature configuration.</p>
              <div className="grid grid-cols-2 gap-4">
                {plans.map(p => (
                  <div key={p.id} className={`border rounded-xl overflow-hidden ${
                    p.name === 'enterprise' ? 'border-purple-200' :
                    p.name === 'team' ? 'border-blue-200' :
                    p.name === 'pro' ? 'border-green-200' : 'border-gray-100'
                  }`}>
                    <div className={`px-5 py-4 border-b ${
                      p.name === 'enterprise' ? 'bg-purple-50 border-purple-100' :
                      p.name === 'team' ? 'bg-blue-50 border-blue-100' :
                      p.name === 'pro' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-black">{p.display_name}</div>
                        <div className="text-sm font-medium text-black">${p.price_monthly}/mo</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{pc.find(x => x.id === p.id)?.count || 0} active users</div>
                    </div>
                    <div className="p-5 flex flex-col gap-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Blueprint limit</span>
                        <span className="font-medium text-black">{p.blueprint_limit === -1 ? 'Unlimited' : `${p.blueprint_limit}/month`}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Est. COGS</span>
                        <span className="font-medium text-black">{p.blueprint_limit === -1 ? 'Variable' : `$${(p.blueprint_limit * 0.0042).toFixed(2)}/mo`}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Gross margin</span>
                        <span className="font-medium text-green-600">
                          {p.price_monthly === 0 ? '—' : `${(((p.price_monthly - (p.blueprint_limit * 0.0042)) / p.price_monthly) * 100).toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Yearly price</span>
                        <span className="font-medium text-black">${p.price_monthly === 0 ? '0' : (p.price_monthly * 10).toFixed(0)}/yr</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTACTS */}
          {activeTab === 'contacts' && (
            <div>
              <h1 className="text-xl font-medium text-black mb-1">Contact form submissions</h1>
              <p className="text-sm text-gray-400 mb-7">Leads and sales enquiries from arch.nexplan.io landing page.</p>

              {contactLoading ? (
                <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
              ) : contacts.length === 0 ? (
                <div className="border border-gray-100 rounded-xl p-12 text-center">
                  <div className="text-3xl text-gray-200 mb-3">📬</div>
                  <div className="text-sm font-medium text-black mb-1">No submissions yet</div>
                  <p className="text-xs text-gray-400">Contact form submissions from the landing page will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan interest</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Message</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts
                          .slice((contactPage - 1) * CONTACTS_PER_PAGE, contactPage * CONTACTS_PER_PAGE)
                          .map(c => (
                            <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                              <td className="px-5 py-3.5">
                                <div className="font-medium text-black">{c.first_name} {c.last_name}</div>
                                <div className="text-gray-400">{c.email}</div>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{c.company || '—'}</td>
                              <td className="px-5 py-3.5">
                                {c.plan_interest ? (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-semibold capitalize">{c.plan_interest}</span>
                                ) : '—'}
                              </td>
                              <td className="px-5 py-3.5 text-gray-600 max-w-xs">
                                <div className="truncate" title={c.message}>{c.message || '—'}</div>
                              </td>
                              <td className="px-5 py-3.5">
                                <select
                                  value={c.status}
                                  onChange={e => updateContactStatus(c.id, e.target.value)}
                                  className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${
                                    c.status === 'new' ? 'bg-blue-50 text-blue-700' :
                                    c.status === 'contacted' ? 'bg-yellow-50 text-yellow-700' :
                                    'bg-green-50 text-green-700'
                                  }`}
                                >
                                  <option value="new">New</option>
                                  <option value="contacted">Contacted</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </td>
                              <td className="px-5 py-3.5 text-gray-400">
                                {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </td>
                              <td className="px-5 py-3.5">
                                <button
                                  onClick={() => deleteContact(c.id)}
                                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {totalContactPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        Showing {Math.min((contactPage - 1) * CONTACTS_PER_PAGE + 1, contacts.length)}–{Math.min(contactPage * CONTACTS_PER_PAGE, contacts.length)} of {contacts.length} submissions
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setContactPage(1)} disabled={contactPage === 1} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">First</button>
                        <button onClick={() => setContactPage(p => p - 1)} disabled={contactPage === 1} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Prev</button>
                        {Array.from({ length: totalContactPages }, (_, i) => i + 1).map(page => (
                          <button key={page} onClick={() => setContactPage(page)} className={`px-2.5 py-1.5 text-xs border rounded-md ${contactPage === page ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`}>{page}</button>
                        ))}
                        <button onClick={() => setContactPage(p => p + 1)} disabled={contactPage === totalContactPages} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Next</button>
                        <button onClick={() => setContactPage(totalContactPages)} disabled={contactPage === totalContactPages} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Last</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

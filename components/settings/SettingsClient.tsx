'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  id: string
  email: string
  full_name: string
  org_name: string
  initials: string
  created_at: string
}

interface Props {
  user: UserData
}

type SettingsTab = 'profile' | 'password' | 'integrations' | 'plan' | 'danger'

export default function SettingsClient({ user }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [fullName, setFullName] = useState(user.full_name)
  const [orgName, setOrgName] = useState(user.org_name)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, org_name: orgName }
    })
    setSaving(false)
    if (error) showToast('Failed: ' + error.message)
    else showToast('Profile updated successfully')
  }

  async function changePassword() {
    setPwError('')
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) setPwError(error.message)
    else {
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated successfully')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/signin'
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'password', label: 'Password' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'plan', label: 'Plan & billing' },
    { id: 'danger', label: 'Danger zone' },
  ]

  const integrations = [
    { name: 'AWS', desc: 'Connect your AWS account for direct deployment', icon: '▲', connected: false },
    { name: 'GitHub', desc: 'Push Terraform code directly to repositories', icon: '⊙', connected: false },
    { name: 'Azure', desc: 'Connect your Azure subscription', icon: '◆', connected: false },
    { name: 'GCP', desc: 'Connect your Google Cloud project', icon: '●', connected: false },
  ]

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
        </div>
        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">Workspace</p>
          <a href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">▦</span> Dashboard
          </a>
          <a href="/project/new" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⌂</span> Greenfield
          </a>
          <span className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-300 opacity-40 cursor-not-allowed">
            <span className="w-4">⬡</span> Brownfield
            <span className="ml-auto text-[10px] border border-dashed border-gray-200 px-1.5 py-0.5 rounded-full">Soon</span>
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-4 pb-1">Configuration</p>
          <a href="/knowledge-base" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⊟</span> Knowledge base
          </a>
          <a href="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-black text-white transition-colors">
            <span className="w-4">⚙</span> Settings
          </a>
        </div>
        <div className="px-3 py-3.5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-black truncate">{user.full_name}</div>
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
            <button onClick={signOut} className="text-gray-400 hover:text-black text-xs px-1.5 py-1 rounded hover:bg-gray-50">↩</button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            Dashboard / <span className="text-black font-medium">Settings</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-7 py-8">
            <h1 className="text-xl font-medium text-black mb-1">Settings</h1>
            <p className="text-sm text-gray-400 mb-7">Manage your account, integrations and billing.</p>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-100 mb-7">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                    activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black',
                    tab.id === 'danger' ? 'ml-auto text-red-400 hover:text-red-600' : ''
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Profile */}
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4 p-5 border border-gray-100 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-lg font-medium">
                    {user.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-black">{user.full_name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Member since {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
                    <div className="text-sm font-semibold text-black">Profile details</div>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Organisation name</label>
                      <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                      <input type="email" value={user.email} disabled
                        className="w-full px-3 py-2.5 border border-gray-100 rounded-md text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                      <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed after verification.</p>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={saveProfile} disabled={saving}
                        className="px-5 py-2 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            {activeTab === 'password' && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
                  <div className="text-sm font-semibold text-black">Change password</div>
                  <div className="text-xs text-gray-400 mt-0.5">Must be at least 8 characters</div>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm new password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors" />
                  </div>
                  {pwError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{pwError}</p>}
                  <div className="flex justify-end">
                    <button onClick={changePassword} disabled={saving}
                      className="px-5 py-2 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-50">
                      {saving ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div className="flex flex-col gap-3">
                {integrations.map(intg => (
                  <div key={intg.name} className="flex items-center justify-between p-5 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-lg">
                        {intg.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-black">{intg.name}</div>
                        <div className="text-xs text-gray-400">{intg.desc}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => showToast(`${intg.name} integration coming soon`)}
                      className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:border-black hover:text-black transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Plan */}
            {activeTab === 'plan' && (
              <div className="flex flex-col gap-4">
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
                    <div className="text-sm font-semibold text-black">Current plan</div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-lg font-medium text-black">Trial plan</div>
                        <div className="text-xs text-gray-400 mt-0.5">14-day free trial — no credit card required</div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Free</span>
                    </div>
                    <div className="flex flex-col gap-2 mb-5">
                      {['3 blueprints per month', 'Greenfield projects only', 'AWS + Azure + GCP support', 'PDF + Terraform export'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500 text-xs">✓</span> {f}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => showToast('Contact info@nexplan.io to upgrade to Pro')}
                      className="w-full py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity"
                    >
                      Upgrade to Pro — $499/mo
                    </button>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
                    <div className="text-sm font-semibold text-black">Pro plan features</div>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-2">
                    {[
                      'Unlimited blueprints', 'Greenfield + Brownfield',
                      'AWS, Azure, GCP support', 'Multi-cloud comparison',
                      'SOC 2, GDPR, HIPAA compliance', 'DR blueprints + RTO/RPO',
                      'GitHub push integration', 'Priority support',
                    ].map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="text-green-500">✓</span> {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Danger */}
            {activeTab === 'danger' && (
              <div className="border border-red-100 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-red-50 bg-red-50">
                  <div className="text-sm font-semibold text-red-700">Danger zone</div>
                  <div className="text-xs text-red-400 mt-0.5">These actions are irreversible</div>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-black">Sign out of all devices</div>
                      <div className="text-xs text-gray-400">Revokes all active sessions</div>
                    </div>
                    <button onClick={signOut}
                      className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:border-black hover:text-black transition-colors">
                      Sign out
                    </button>
                  </div>
                  <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-red-600">Delete account</div>
                      <div className="text-xs text-gray-400">Permanently deletes your account and all blueprints</div>
                    </div>
                    <button
                      onClick={() => showToast('Contact info@nexplan.io to delete your account')}
                      className="px-4 py-1.5 border border-red-200 text-red-600 rounded-md text-xs font-medium hover:bg-red-50 transition-colors">
                      Delete account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
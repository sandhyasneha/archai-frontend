'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [strength, setStrength] = useState(0)

  function checkStrength(value: string) {
    let score = 0
    if (value.length >= 8) score++
    if (/[A-Z]/.test(value)) score++
    if (/[0-9]/.test(value)) score++
    if (/[^A-Za-z0-9]/.test(value)) score++
    setStrength(score)
  }

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#c0392b', '#b7860b', '#1a7a4a', '#1a7a4a']
  const strengthWidth = ['0%', '25%', '50%', '75%', '100%']

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  return (
    <div className="flex h-screen w-full">
      <div className="w-[380px] flex-shrink-0 bg-[#0a0a0a] text-white flex flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-white rounded flex items-center justify-center text-xs font-bold">A</div>
          <span className="text-sm font-semibold tracking-widest uppercase">ArchAI</span>
        </div>
        <div>
          <h1 className="text-3xl font-medium leading-tight tracking-tight mb-4">
            Reset your password.
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Choose a strong password to keep your organisation workspace and cloud blueprints secure.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {[
            'Use at least 8 characters',
            'Mix uppercase, numbers and symbols',
            'Do not reuse old passwords',
          ].map((f) => (
            <div key={f} className="flex items-start gap-3 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-10 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Set new password</h2>
          <p className="text-sm text-gray-400 mb-8">
            Enter your new password below to regain access to your workspace.
          </p>

          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); checkStrength(e.target.value) }}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"
              />
              {password && (
                <div className="mt-1.5">
                  <div className="h-0.5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: strengthWidth[strength], background: strengthColor[strength] }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40"
            >
              {loading ? 'Updating password...' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
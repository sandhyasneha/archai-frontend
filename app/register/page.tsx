'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isPersonalDomain } from '@/lib/config'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [terms, setTerms] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [strength, setStrength] = useState(0)

  function validateEmail(value: string): boolean {
    setEmailError('')
    if (!value) return false
    if (isPersonalDomain(value)) {
      setEmailError('Gmail, Yahoo, and personal domains are not allowed. Use your company email.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid organisation email address.')
      return false
    }
    return true
  }

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!validateEmail(email)) return
    if (!firstName || !lastName) { setFormError('Please enter your full name.'); return }
    if (!orgName) { setFormError('Please enter your organisation name.'); return }
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return }
    if (!terms) { setFormError('Please accept the terms to continue.'); return }

    setLoading(true)
    setFormError('')

    
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `https://arch.nexplan.io/auth/callback`,
    data: {
      full_name: `${firstName} ${lastName}`,
      org_name: orgName,
    },
  },
})

    if (error) {
      setFormError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    }
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
            Infrastructure expertise, built in.
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Designed for engineering leads, DevOps teams, and CTOs who need production-grade cloud architecture without the consulting overhead.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {[
            'Organisation accounts only — keeps your data isolated and secure',
            '14-day free trial, no credit card required',
            'Supabase-backed with row-level security per organisation',
            'Deploy to production in minutes, not months',
          ].map((f) => (
            <div key={f} className="flex items-start gap-3 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-10 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Create account</h2>
          <p className="text-sm text-gray-400 mb-6">
            Organisation accounts only. Gmail, Yahoo, and personal domains are not permitted.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-500 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Business or organisation email required
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Chen"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Organisation email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value) }}
                placeholder="you@yourcompany.com"
                className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors focus:border-black ${emailError ? 'border-red-400' : email && !emailError ? 'border-green-500' : 'border-gray-200'}`}
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Organisation name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); checkStrength(e.target.value) }}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-black"
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
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

            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="terms"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 cursor-pointer accent-black flex-shrink-0"
              />
              <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-black underline hover:no-underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-black underline hover:no-underline">Privacy Policy</Link>
                . ArchAI processes data under GDPR-compliant infrastructure.
              </label>
            </div>

            {formError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{formError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/signin" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
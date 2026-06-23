'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isPersonalDomain } from '@/lib/config'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  function validateEmail(value: string): boolean {
    setEmailError('')
    if (!value) { setEmailError('Email is required.'); return false }
    if (isPersonalDomain(value)) {
      setEmailError('Personal email addresses are not permitted. Please use your organisation email.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid email address.')
      return false
    }
    return true
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!validateEmail(email)) return
    if (!password) { setFormError('Password is required.'); return }

    setLoading(true)
    setFormError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setFormError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex h-screen w-full">

      {/* Left brand panel */}
      <div className="w-[420px] flex-shrink-0 bg-[#0a0a0a] text-white flex flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-white rounded flex items-center justify-center text-xs font-bold">A</div>
          <span className="text-sm font-semibold tracking-widest uppercase">ArchAI</span>
        </div>

        <div>
          <h1 className="text-3xl font-medium leading-tight tracking-tight mb-4">
            Your autonomous cloud architect, on demand.
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Replace weeks of consulting with minutes of AI-driven infrastructure design, security audit, and cost optimisation.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            '4-agent AI pipeline — Gatekeeper, Architect, Engineer, Auditor',
            'Deployment-ready Terraform output, audited before you see it',
            'SOC 2, GDPR, HIPAA guardrails auto-applied at design time',
            'Multi-cloud cost comparison across AWS, Azure and GCP',
          ].map((f) => (
            <div key={f} className="flex items-start gap-3 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-10 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-8">
            Use your organisation email to access your workspace.
          </p>

          <form onSubmit={handleSignIn} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Organisation email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value) }}
                placeholder="you@yourcompany.com"
                className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors
                  ${emailError ? 'border-red-400' : email && !emailError ? 'border-green-500' : 'border-gray-200'}
                  focus:border-black`}
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            {/* Forgot password */}
            <div className="text-right -mt-2">
              <span className="text-xs text-gray-400 cursor-pointer hover:text-black">
                Forgot password?
              </span>
            </div>

            {/* Form error */}
            {formError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{formError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black text-white rounded-md text-sm font-medium
                hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <p className="text-center text-sm text-gray-400">
            No account yet?{' '}
            <Link href="/register" className="text-black font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
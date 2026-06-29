import Link from 'next/link'

interface Props {
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyPage({ searchParams }: Props) {
  const params = await searchParams
  const email = params.email || 'your organisation email'

  return (
    <div className="flex h-screen w-full">
      <div className="w-[380px] flex-shrink-0 bg-[#0a0a0a] text-white flex flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-white rounded flex items-center justify-center text-xs font-bold">A</div>
          <span className="text-sm font-semibold tracking-widest uppercase">ArchAI</span>
        </div>
        <div>
          <h1 className="text-3xl font-medium leading-tight tracking-tight mb-4">
            One last step.
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Email verification keeps your organisation workspace secure and ensures only authorised team members can access your cloud blueprints.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {[
            'Your blueprints and Terraform code are waiting',
            'Organisation data isolated with row-level security',
            'Verification link expires in 24 hours',
          ].map((f) => (
            <div key={f} className="flex items-start gap-3 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-10 bg-white">
        <div className="w-full max-w-sm text-center">

          {/* Icon */}
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <h2 className="text-2xl font-medium tracking-tight text-black mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-400 mb-2 leading-relaxed">
            We sent a verification link to
          </p>
          <p className="text-sm font-medium text-black mb-6 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 inline-block">
            {email}
          </p>

          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            Click the link in the email to verify your address and activate your ArchAI workspace.
          </p>

          {/* Steps */}
          <div className="text-left border border-gray-100 rounded-xl overflow-hidden mb-8">
            {[
              { step: '1', text: 'Open your email inbox' },
              { step: '2', text: 'Find the email from ArchAI' },
              { step: '3', text: 'Click "Verify email address"' },
              { step: '4', text: 'You\'ll be redirected to your dashboard' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {item.step}
                </div>
                <span className="text-sm text-gray-600">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Didn&apos;t receive the email? Check your spam folder.
          </p>

          <Link
            href="/register"
            className="text-xs text-gray-400 hover:text-black transition-colors underline"
          >
            Use a different email address
          </Link>
        </div>
      </div>
    </div>
  )
}
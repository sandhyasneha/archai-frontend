import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | ArchAI',
  description: 'Privacy Policy for ArchAI, an AI-powered cloud architecture platform operated by Nexplan IT LLC.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-7 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
        </Link>
        <Link href="/signin" className="text-xs text-gray-400 hover:text-black transition-colors">← Back to sign in</Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-medium tracking-tight text-black mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: 7 July 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700">

          <section>
            <p>
              This Privacy Policy explains how Nexplan IT LLC (&quot;Nexplan,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;) collects, uses, and protects information when you use ArchAI at arch.nexplan.io
              (the &quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">1. Information We Collect</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Account information:</strong> name, organisation email, organisation name, and password (stored hashed).</li>
              <li><strong>Infrastructure input:</strong> prompts, descriptions, Terraform code, or state files you submit to generate blueprints or migration plans.</li>
              <li><strong>Knowledge Base uploads:</strong> compliance documents, naming conventions, and budget policies you optionally upload.</li>
              <li><strong>Usage data:</strong> blueprints generated, tokens consumed, and feature usage, for billing and plan enforcement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information to operate the Service: generating blueprints and migration plans, enforcing
              plan limits, providing support, and improving the Service. Infrastructure input you submit is sent to
              our AI model provider (Anthropic) to generate blueprints, audits, and Terraform output, and is not
              used by Nexplan to train any model.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">3. Data Storage &amp; Security</h2>
            <p>
              Your data is stored using Supabase with row-level security, ensuring your organisation&apos;s data is
              isolated from other customers. Passwords are hashed and never stored in plain text.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">4. Third-Party Subprocessors</h2>
            <p>We share data with the following subprocessors solely to operate the Service:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
              <li><strong>Anthropic</strong> — processes infrastructure input to generate AI agent output.</li>
              <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
              <li><strong>Vercel</strong> — application hosting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">5. Data Retention &amp; Deletion</h2>
            <p>
              We retain your account and generated blueprint data for as long as your account is active. You may
              request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">6. Your Rights (GDPR)</h2>
            <p>
              If you are located in the EU/EEA, you have the right to access, correct, delete, or export your
              personal data, and to object to or restrict certain processing. To exercise these rights, contact us
              at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">7. Cookies</h2>
            <p>
              We use only essential cookies required to maintain your authenticated session. We do not use
              third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be reflected by updating
              the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-2">9. Contact</h2>
            <p>
              Nexplan IT LLC<br />
              1001 S Main Street, STE 600<br />
              Kalispell, MT 59901<br />
              <a href="mailto:info@nexplanit.com" className="text-black underline">info@nexplanit.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}

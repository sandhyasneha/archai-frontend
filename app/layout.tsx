import type { Metadata } from 'next'
import './globals.css'
import KeystoneWidget from '@/components/keystone/KeystoneWidget'

export const metadata: Metadata = {
  title: 'ArchAI — Enterprise Cloud Architect Platform',
  description: 'AI-powered cloud infrastructure design',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <KeystoneWidget />
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import './globals.css'
import KeystoneMount from '@/components/keystone/KeystoneMount'

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
        <KeystoneMount />
      </body>
    </html>
  )
}
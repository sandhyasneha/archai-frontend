'use client'

import dynamic from 'next/dynamic'

const KeystoneWidget = dynamic(() => import('@/components/keystone/KeystoneWidget'), { ssr: false })

export default function KeystoneMount() {
  return <KeystoneWidget />
}

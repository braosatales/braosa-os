'use client'

import TopNav from './TopNav'
import { useLockTimer } from '@/lib/useLockTimer'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { setLocked } = useLockTimer()

  return (
    <>
      <TopNav onLock={() => setLocked(true)} />
      <main style={{ paddingTop: 62 }}>
        {children}
      </main>
    </>
  )
}

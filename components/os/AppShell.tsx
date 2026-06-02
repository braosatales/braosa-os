'use client'

import TopNav from './TopNav'
import Sidebar from './Sidebar'
import LockScreen from './LockScreen'
import { useLockTimer } from '@/lib/useLockTimer'

interface AppShellProps {
  system: string
  children: React.ReactNode
}

export default function AppShell({ system, children }: AppShellProps) {
  const { locked, setLocked } = useLockTimer()
  const hasSidebar = system !== 'dashboard'

  return (
    <>
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
      <TopNav />
      {hasSidebar && <Sidebar system={system} />}
      <main
        className={`mt-12 min-h-[calc(100vh-48px)] p-6${hasSidebar ? ' ml-[185px]' : ''}`}
      >
        {children}
      </main>
    </>
  )
}

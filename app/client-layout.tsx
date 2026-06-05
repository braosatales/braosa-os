'use client'

import { useState, useEffect } from 'react'
import LockScreen from '@/components/os/LockScreen'
import TopNav from '@/components/os/TopNav'
import { useLockTimer } from '@/lib/useLockTimer'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { locked, setLocked } = useLockTimer()

  function handleLock() {
    setLocked(true)
  }

  async function handleUnlock() {
    setLocked(false)
    await fetch('/api/user/upsert', { method: 'POST' })
  }

  return (
    <>
      {locked && <LockScreen onUnlock={handleUnlock} />}
      <div style={{
        height: '100vh', overflow: 'hidden',
        filter: locked ? 'blur(15px) brightness(0.68)' : 'none',
        transform: locked ? 'scale(1.025)' : 'none',
        pointerEvents: locked ? 'none' : 'auto',
        transition: 'filter 0.4s, transform 0.4s',
        background: 'radial-gradient(120% 100% at 50% 0%, oklch(0.205 0.007 70), var(--bg-void))',
      }} className="app-grain">
        <TopNav onLock={handleLock} />
        {children}
      </div>
    </>
  )
}

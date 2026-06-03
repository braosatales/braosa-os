'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const IDLE_MS = 10 * 60 * 1000

export function useLockTimer() {
  const [locked, setLocked] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLocked(true), IDLE_MS)
  }, [])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const

    function handleActivity() {
      if (!locked) resetTimer()
    }

    function handleLockEvent() {
      setLocked(true)
    }

    events.forEach(e => window.addEventListener(e, handleActivity))
    window.addEventListener('braosa:lock', handleLockEvent)
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
      window.removeEventListener('braosa:lock', handleLockEvent)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [locked, resetTimer])

  return { locked, setLocked }
}

"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import LockScreen from "@/components/lockscreen/LockScreen"
import { isLocked, lock } from "@/lib/lockscreen"

interface LockContextValue {
  lock: () => void
}

const LockContext = createContext<LockContextValue>({ lock: () => {} })

export function useLock(): LockContextValue {
  return useContext(LockContext)
}

export default function OsLayout({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    setLocked(isLocked())
  }, [])

  const handleUnlock = useCallback(() => {
    setLocked(false)
  }, [])

  const doLock = useCallback(() => {
    lock()
    setLocked(true)
  }, [])

  return (
    <LockContext.Provider value={{ lock: doLock }}>
      <div
        style={
          locked
            ? {
                filter: "blur(15px) brightness(0.68)",
                transform: "scale(1.025)",
                pointerEvents: "none",
                transition: "filter .3s, transform .3s",
              }
            : {}
        }
      >
        {children}
      </div>
      {locked && <LockScreen onUnlock={handleUnlock} />}
    </LockContext.Provider>
  )
}

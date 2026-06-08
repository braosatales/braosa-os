"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import LockScreen from "@/components/lockscreen/LockScreen"
import TopNav from "@/components/topnav/TopNav"
import { isLocked, lock } from "@/lib/lockscreen"
import { getUser, type OSUser } from "@/lib/user"

// ─── LockContext ─────────────────────────────────────────────────────────────

interface LockContextValue {
  lock: () => void
}

const LockContext = createContext<LockContextValue>({ lock: () => {} })

export function useLock(): LockContextValue {
  return useContext(LockContext)
}

// ─── NavigationContext ───────────────────────────────────────────────────────

interface NavigationContextValue {
  active: string
  navigate: (id: string) => void
}

export const NavigationContext = createContext<NavigationContextValue>({
  active: "dashboard",
  navigate: () => {},
})

export function useNavigation(): NavigationContextValue {
  return useContext(NavigationContext)
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function OsLayout({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [active, setActive] = useState("dashboard")
  const [user, setUser] = useState<OSUser | null>(null)

  useEffect(() => {
    setLocked(isLocked())
    getUser().then(setUser)
  }, [])

  const handleUnlock = useCallback(() => {
    setLocked(false)
  }, [])

  const doLock = useCallback(() => {
    lock()
    setLocked(true)
  }, [])

  const navigate = useCallback((id: string) => {
    setActive(id)
  }, [])

  const blurStyle = {
    filter: "blur(15px) brightness(0.68)",
    transform: "scale(1.025)",
    pointerEvents: "none" as const,
    transition: "filter .3s, transform .3s",
  }

  return (
    <LockContext.Provider value={{ lock: doLock }}>
      <NavigationContext.Provider value={{ active, navigate }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
            ...(locked ? blurStyle : {}),
          }}
        >
          <TopNav
            active={active}
            onNavigate={navigate}
            onLock={doLock}
            onSettings={() => {}}
            user={user}
          />
          {children}
        </div>
        {locked && <LockScreen onUnlock={handleUnlock} />}
      </NavigationContext.Provider>
    </LockContext.Provider>
  )
}

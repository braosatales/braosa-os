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
import SettingsModal from "@/components/settings/SettingsModal"
import TweaksPanel from "@/components/tweaks/TweaksPanel"
import { isLocked, lock } from "@/lib/lockscreen"
import { getUser, type OSUser } from "@/lib/user"
import { getTweaks, saveTweaks } from "@/lib/tweaks"
import { SYSTEMS } from "@/lib/constants"
import { Icon } from "@/components/ui"

export { useTweaksPanel } from "@/components/tweaks/TweaksPanel"

// ─── ComingOnline ─────────────────────────────────────────────────────────────

function ComingOnline({ id }: { id: string }) {
  const sys = SYSTEMS.find((s) => s.id === id)
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <span style={{ color: sys?.color ?? "var(--ink-dim)", display: "flex" }}>
        <Icon name={(sys?.icon as any) ?? "grid"} size={32} />
      </span>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 600,
          color: "var(--ink)",
        }}
      >
        Coming online
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--ink-faint)",
        }}
      >
        STATUS · STANDING BY
      </div>
    </div>
  )
}

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
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setLocked(isLocked())
    getUser().then(setUser)
    saveTweaks(getTweaks())
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
            onSettings={() => setSettingsOpen(true)}
            user={user}
          />
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {active === "dashboard" ? children : <ComingOnline id={active} />}
          </div>
        </div>
        {locked && <LockScreen onUnlock={handleUnlock} />}
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onLock={doLock}
        />
        <TweaksPanel />
      </NavigationContext.Provider>
    </LockContext.Provider>
  )
}

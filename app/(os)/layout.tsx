"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react"
import dynamic from "next/dynamic"
import LockScreen from "@/components/lockscreen/LockScreen"
import TopNav from "@/components/topnav/TopNav"
import BottomNav from "@/components/nav/BottomNav"
import SettingsModal from "@/components/settings/SettingsModal"
import { isLocked, lock } from "@/lib/lockscreen"
import { getUser, type OSUser } from "@/lib/user"
import { getTweaks, saveTweaks } from "@/lib/tweaks"
import { SYSTEMS, COMPANIES } from "@/lib/constants"
import { Icon } from "@/components/ui"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { TaskStore } from "@/lib/task-store"
import { NoteStore } from "@/lib/note-store"
import { FinanceStore } from "@/lib/finance-store"

const DashboardPage = dynamic(() => import("./dashboard/page"), { ssr: false })
const FinancesPage  = dynamic(() => import("./finances/page"),  { ssr: false })
const TasksPage     = dynamic(() => import("./tasks/page"),     { ssr: false })
const NotesPage     = dynamic(() => import("./notes/page"),     { ssr: false })
const AIPage        = dynamic(() => import("./ai/page"),        { ssr: false })
const HealthPage    = dynamic(() => import("./health/page"),    { ssr: false })

// ─── ComingOnlinePage ────────────────────────────────────────────────────────

function ComingOnlinePage({ id }: { id: string }) {
  const allSystems = [...SYSTEMS, ...COMPANIES]
  const sys = allSystems.find(s => s.id === id)
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: `color-mix(in oklch, ${sys?.color ?? "var(--c-dash)"} 15%, var(--bg-raised))`,
        border: `1px solid color-mix(in oklch, ${sys?.color ?? "var(--c-dash)"} 30%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 calc(30px * var(--glow)) -8px ${sys?.color ?? "var(--c-dash)"}`,
      }}>
        <span style={{ color: sys?.color ?? "var(--c-dash)" }}>
          <Icon name={(sys?.icon ?? "grid") as any} size={26} />
        </span>
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--ink)", textAlign: "center" }}>
          {sys?.label ?? id}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>
          STATUS · STANDING BY
        </div>
      </div>
    </div>
  )
}

// ─── renderActive ────────────────────────────────────────────────────────────

function renderActive(active: string) {
  switch (active) {
    case "dashboard": return <DashboardPage />
    case "finances":  return <FinancesPage />
    case "tasks":     return <TasksPage />
    case "notes":     return <NotesPage />
    case "ai":        return <AIPage />
    case "health":    return <HealthPage />
    default:          return <ComingOnlinePage id={active} />
  }
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

export default function OsLayout({ children: _children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [active, setActive] = useState("dashboard")
  const [user, setUser] = useState<OSUser | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocked(isLocked())
    getUser().then(setUser)
    saveTweaks(getTweaks())
    TaskStore.fetch()
    NoteStore.fetch()
    FinanceStore.fetch()

    // Background bank sync if any connection is stale (> 4 hours)
    fetch('/api/bank/connections')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.connections) return
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000
        const hasStale = d.connections.some((c: { status: string; last_synced_at: string | null }) =>
          c.status === 'linked' &&
          (!c.last_synced_at || new Date(c.last_synced_at).getTime() < fourHoursAgo)
        )
        if (hasStale) {
          fetch('/api/bank/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }).then(() => FinanceStore.invalidate()).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [active])

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
          <div className="desktop-only">
            <TopNav
              active={active}
              onNavigate={navigate}
              onLock={doLock}
              onSettings={() => setSettingsOpen(true)}
              user={user}
            />
          </div>
          <div
            ref={contentRef}
            className="mobile-bottom-pad"
            style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}
          >
            <ErrorBoundary>
              {renderActive(active)}
            </ErrorBoundary>
          </div>
          <BottomNav />
        </div>
        {locked && <LockScreen onUnlock={handleUnlock} />}
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onLock={doLock}
        />
      </NavigationContext.Provider>
    </LockContext.Provider>
  )
}

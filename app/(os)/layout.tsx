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
import { ContactStore } from "@/lib/contact-store"
import GoogleConnectPrompt from "@/components/google/GoogleConnectPrompt"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import MobileHomeScreen from "@/components/mobile/MobileHomeScreen"
import MobileAppContainer from "@/components/mobile/MobileAppContainer"
import { MOBILE_APPS } from "@/lib/mobile-apps"
import { MobileSubTabContext } from "@/lib/mobile-context"

const DashboardPage  = dynamic(() => import("./dashboard/page"),  { ssr: false })
const FinancesPage   = dynamic(() => import("./finances/page"),   { ssr: false })
const TasksPage      = dynamic(() => import("./tasks/page"),      { ssr: false })
const NotesPage      = dynamic(() => import("./notes/page"),      { ssr: false })
const AIPage         = dynamic(() => import("./ai/page"),         { ssr: false })
const HealthPage     = dynamic(() => import("./health/page"),     { ssr: false })
const ContactsPage   = dynamic(() => import("./contacts/page"),   { ssr: false })
const MailPage       = dynamic(() => import("./mail/page"),       { ssr: false })
const CalendarShell  = dynamic(() => import("@/components/calendar/CalendarShell"), { ssr: false })
const DriveShell     = dynamic(() => import("@/components/drive/DriveShell"),     { ssr: false })
const BraosaShell    = dynamic(() => import("@/components/braosa/BraosaShell"),   { ssr: false })
const VerumShell     = dynamic(() => import("@/components/verum/VerumShell"),     { ssr: false })
const NutritionShell = dynamic(() => import("@/components/nutrition/NutritionShell"), { ssr: false })

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
          <Icon name={(sys?.glyph ?? "grid") as any} size={26} />
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

// ─── Google tab metadata ─────────────────────────────────────────────────────

const GOOGLE_TAB_META: Record<string, { tabName: string; description: string; icon: string; color: string }> = {
  email:    { tabName: "Mail",     description: "Acede ao teu Gmail diretamente no BraosaOS.",  icon: "mail",  color: "var(--c-mail)"  },
  mail:     { tabName: "Mail",     description: "Acede ao teu Gmail diretamente no BraosaOS.",  icon: "mail",  color: "var(--c-mail)"  },
  calendar: { tabName: "Calendar", description: "Vê e gere o teu Google Calendar.",              icon: "cal",   color: "var(--c-cal)"   },
  contacts: { tabName: "Contacts", description: "Os teus contactos Google num CRM pessoal.",     icon: "users", color: "var(--c-contacts)" },
  drive:    { tabName: "Drive",    description: "Acede aos teus ficheiros do Google Drive.",     icon: "file",  color: "var(--c-drive)"    },
}

// ─── renderActive ────────────────────────────────────────────────────────────

function renderActive(active: string, googleConnected: boolean | null) {
  const googleMeta = GOOGLE_TAB_META[active]
  if (googleMeta && googleConnected === false) {
    return <GoogleConnectPrompt {...googleMeta} />
  }

  switch (active) {
    case "dashboard": return <DashboardPage />
    case "finances":  return <FinancesPage />
    case "tasks":     return <TasksPage />
    case "notes":     return <NotesPage />
    case "ai":        return <AIPage />
    case "health":    return <HealthPage />
    case "contacts":  return <ContactsPage />
    case "email":
    case "mail":      return <MailPage />
    case "calendar":  return <CalendarShell />
    case "drive":     return <DriveShell />
    case "braosa":    return <BraosaShell />
    case "verum":     return <VerumShell />
    case "nutrition": return <NutritionShell />
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
  googleConnected: boolean | null
  refreshGoogleStatus: () => void
}

export const NavigationContext = createContext<NavigationContextValue>({
  active: "dashboard",
  navigate: () => {},
  googleConnected: null,
  refreshGoogleStatus: () => {},
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
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
  const [mobileOpenApp, setMobileOpenApp] = useState<string | null>(null)
  const [mobileSubTab, setMobileSubTab] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const refreshGoogleStatus = useCallback(() => {
    fetch('/api/google/status')
      .then(r => r.json())
      .then(d => setGoogleConnected(d.connected ?? false))
      .catch(() => setGoogleConnected(false))
  }, [])

  useEffect(() => {
    setLocked(isLocked())
    getUser().then(setUser)
    saveTweaks(getTweaks())
    TaskStore.fetch()
    NoteStore.fetch()
    FinanceStore.fetch()
    ContactStore.fetch()
    refreshGoogleStatus()

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

  // Restore last open app on mobile mount
  useEffect(() => {
    if (!isMobile) return
    try {
      const saved = localStorage.getItem('braosa-last-app')
      if (saved) {
        const { appId, subTabId } = JSON.parse(saved)
        if (appId && MOBILE_APPS.find(a => a.id === appId)) {
          setMobileOpenApp(appId)
          setMobileSubTab(subTabId || '')
          setActive(appId)
        }
      }
    } catch {}
  }, [isMobile])

  // Persist last open app
  useEffect(() => {
    if (!isMobile || !mobileOpenApp) return
    localStorage.setItem('braosa-last-app', JSON.stringify({ appId: mobileOpenApp, subTabId: mobileSubTab }))
    if (mobileSubTab) {
      localStorage.setItem(`braosa-subtab-${mobileOpenApp}`, mobileSubTab)
    }
  }, [isMobile, mobileOpenApp, mobileSubTab])

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

  const handleOpenApp = useCallback((appId: string) => {
    const app = MOBILE_APPS.find(a => a.id === appId)
    const firstSubTab = app?.subTabs?.[0]?.id || ''
    let subTab = firstSubTab
    try {
      const saved = localStorage.getItem(`braosa-subtab-${appId}`)
      if (saved) subTab = saved
    } catch {}
    setMobileSubTab(subTab)
    setMobileOpenApp(appId)
    setActive(appId)
  }, [])

  const handleCloseApp = useCallback(() => {
    setMobileOpenApp(null)
    try { localStorage.removeItem('braosa-last-app') } catch {}
  }, [])

  const blurStyle = {
    filter: "blur(15px) brightness(0.68)",
    transform: "scale(1.025)",
    pointerEvents: "none" as const,
    transition: "filter .3s, transform .3s",
  }

  // ─── Mobile render ──────────────────────────────────────────────────────────

  if (isMobile) {
    let mobileContent: React.ReactNode

    if (mobileOpenApp === null) {
      mobileContent = <MobileHomeScreen onOpenApp={handleOpenApp} />
    } else {
      const app = MOBILE_APPS.find(a => a.id === mobileOpenApp)
      if (!app) {
        mobileContent = <MobileHomeScreen onOpenApp={handleOpenApp} />
      } else {
        mobileContent = (
          <MobileSubTabContext.Provider value={{ activeSubTab: mobileSubTab, setSubTab: setMobileSubTab }}>
            <MobileAppContainer
              appId={mobileOpenApp}
              app={app}
              subTabId={mobileSubTab}
              onSubTabChange={setMobileSubTab}
              onClose={handleCloseApp}
            >
              <ErrorBoundary>
                {renderActive(mobileOpenApp, googleConnected)}
              </ErrorBoundary>
            </MobileAppContainer>
          </MobileSubTabContext.Provider>
        )
      }
    }

    return (
      <LockContext.Provider value={{ lock: doLock }}>
        <NavigationContext.Provider value={{ active, navigate, googleConnected, refreshGoogleStatus }}>
          <div style={locked ? blurStyle : {}}>
            {mobileContent}
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

  // ─── Desktop render ─────────────────────────────────────────────────────────

  return (
    <LockContext.Provider value={{ lock: doLock }}>
      <NavigationContext.Provider value={{ active, navigate, googleConnected, refreshGoogleStatus }}>
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
          <div
            ref={contentRef}
            style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}
          >
            <ErrorBoundary>
              {renderActive(active, googleConnected)}
            </ErrorBoundary>
          </div>
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

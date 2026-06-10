'use client'
import { useState, useContext, createContext } from 'react'
import { Icon } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useLang, L } from '@/lib/i18n'
import { MobileSubTabContext } from '@/lib/mobile-context'
import { PlannedSession } from '@/lib/journey'
import OverviewView from './views/OverviewView'
import JourneyView from './views/JourneyView'
import WorkoutView from './views/WorkoutView'
import RoutinesView from './views/RoutinesView'
import HistoryView from './views/HistoryView'
import ProfileView from './views/ProfileView'

type HealthTab = 'overview' | 'journey' | 'workout' | 'routines' | 'history' | 'profile'

export type HealthContextValue = {
  navigateTo: (tab: string) => void
  startWorkout: (session: PlannedSession | null, routineId?: string) => void
  pendingSession: PlannedSession | null
  pendingRoutineId: string | null
  clearPending: () => void
}

export const HealthContext = createContext<HealthContextValue>({
  navigateTo: () => {},
  startWorkout: () => {},
  pendingSession: null,
  pendingRoutineId: null,
  clearPending: () => {},
})

export function useHealth() { return useContext(HealthContext) }

const HEALTH_TABS = [
  { id: 'overview',  label: () => L('Visão Geral', 'Overview'),  glyph: 'activity'   },
  { id: 'journey',   label: () => L('Jornada',     'Journey'),   glyph: 'target'     },
  { id: 'workout',   label: () => L('Treino',      'Workout'),   glyph: 'flame'      },
  { id: 'routines',  label: () => L('Rotinas',     'Routines'),  glyph: 'list'       },
  { id: 'history',   label: () => L('Histórico',   'History'),   glyph: 'chart-line' },
  { id: 'profile',   label: () => L('Perfil',      'Profile'),   glyph: 'user'       },
] as const

function renderView(tab: HealthTab, onNavigate: (t: string) => void) {
  switch (tab) {
    case 'overview':  return <OverviewView onNavigate={onNavigate} />
    case 'journey':   return <JourneyView onNavigate={onNavigate} />
    case 'workout':   return <WorkoutView />
    case 'routines':  return <RoutinesView />
    case 'history':   return <HistoryView />
    case 'profile':   return <ProfileView onNavigate={onNavigate} />
  }
}

export default function HealthShell() {
  useLang()
  const isMobile = useIsMobile()
  const { activeSubTab: mobileSubTab, setSubTab: setMobileSubTab } = useContext(MobileSubTabContext)
  const [desktopTab, setDesktopTab] = useState<HealthTab>('overview')
  const [pendingSession, setPendingSession] = useState<PlannedSession | null>(null)
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null)

  const activeTab = (isMobile ? (mobileSubTab as HealthTab) || 'overview' : desktopTab)

  const navigateTo = (tab: string) => {
    if (isMobile) setMobileSubTab(tab)
    else setDesktopTab(tab as HealthTab)
  }

  const startWorkout = (session: PlannedSession | null, routineId?: string) => {
    setPendingSession(session)
    setPendingRoutineId(routineId ?? null)
    navigateTo('workout')
  }

  const clearPending = () => {
    setPendingSession(null)
    setPendingRoutineId(null)
  }

  return (
    <HealthContext.Provider value={{ navigateTo, startWorkout, pendingSession, pendingRoutineId, clearPending }}>
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>

        {/* Desktop left sidebar */}
        {!isMobile && (
          <div
            className="fin-sidebar"
            style={{
              width: 200,
              flexShrink: 0,
              background: 'linear-gradient(180deg, var(--bg-raised), transparent)',
              borderRight: '1px solid var(--edge-soft)',
              padding: '18px 10px',
            }}
          >
            <div
              className="subnav-label"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-faint)',
                letterSpacing: '0.18em',
                padding: '0 8px',
                marginBottom: 12,
              }}
            >
              {L('SAÚDE', 'HEALTH')}
            </div>

            {HEALTH_TABS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  className="subnav-item"
                  onClick={() => navigateTo(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: isActive ? '9px 10px 9px 8px' : '9px 10px',
                    borderRadius: 9,
                    width: '100%',
                    cursor: 'pointer',
                    border: 'none',
                    background: isActive
                      ? 'color-mix(in oklch, var(--c-health) 14%, transparent)'
                      : 'transparent',
                    color: isActive ? 'var(--c-health)' : 'var(--ink-dim)',
                    borderLeft: isActive ? '2px solid var(--c-health)' : '2px solid transparent',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ display: 'flex', color: 'inherit' }}>
                    <Icon name={item.glyph as Parameters<typeof Icon>[0]['name']} size={15} />
                  </span>
                  <span className="subnav-label" style={{ fontSize: 13, fontWeight: 500 }}>
                    {item.label()}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {renderView(activeTab, navigateTo)}
        </div>
      </div>
    </HealthContext.Provider>
  )
}

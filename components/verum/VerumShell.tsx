'use client'
import { useState, useContext, createContext } from 'react'
import { Icon } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useLang, L } from '@/lib/i18n'
import { MobileSubTabContext } from '@/lib/mobile-context'
import DashboardView from './views/DashboardView'
import ProjectsView from './views/ProjectsView'
import TeamView from './views/TeamView'
import FinancialsView from './views/FinancialsView'

type VerumTab = 'dashboard' | 'projects' | 'team' | 'financials'

export type VerumContextValue = {
  navigateTo: (tab: VerumTab) => void
}

export const VerumContext = createContext<VerumContextValue>({ navigateTo: () => {} })
export function useVerum() { return useContext(VerumContext) }

const VERUM_TABS = [
  { id: 'dashboard'  as const, label: () => L('Dashboard',  'Dashboard'),  glyph: 'grid'     as const },
  { id: 'projects'   as const, label: () => L('Projetos',   'Projects'),   glyph: 'building' as const },
  { id: 'team'       as const, label: () => L('Equipa',     'Team'),       glyph: 'users'    as const },
  { id: 'financials' as const, label: () => L('Financeiro', 'Financials'), glyph: 'coins'    as const },
]

function renderView(tab: VerumTab) {
  switch (tab) {
    case 'dashboard':  return <DashboardView />
    case 'projects':   return <ProjectsView />
    case 'team':       return <TeamView />
    case 'financials': return <FinancialsView />
  }
}

export default function VerumShell() {
  useLang()
  const isMobile = useIsMobile()
  const { activeSubTab: mobileSubTab, setSubTab: setMobileSubTab } = useContext(MobileSubTabContext)
  const [desktopTab, setDesktopTab] = useState<VerumTab>('dashboard')

  const activeTab = (isMobile ? (mobileSubTab as VerumTab) || 'dashboard' : desktopTab)

  const navigateTo = (tab: VerumTab) => {
    if (isMobile) setMobileSubTab(tab)
    else setDesktopTab(tab)
  }

  return (
    <VerumContext.Provider value={{ navigateTo }}>
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>

        {/* Desktop left sidebar */}
        {!isMobile && (
          <div
            style={{
              width: 200,
              flexShrink: 0,
              background: 'linear-gradient(180deg, var(--bg-raised), transparent)',
              borderRight: '1px solid var(--edge-soft)',
              padding: '18px 10px',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 16 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'var(--c-verum)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'oklch(0.18 0.01 80)',
                flexShrink: 0,
              }}>
                VF
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-faint)',
                letterSpacing: '0.18em',
              }}>
                VERUM
              </div>
            </div>

            {VERUM_TABS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
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
                      ? 'color-mix(in oklch, var(--c-verum) 14%, transparent)'
                      : 'transparent',
                    color: isActive ? 'var(--c-verum)' : 'var(--ink-dim)',
                    borderLeft: isActive ? '2px solid var(--c-verum)' : '2px solid transparent',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ display: 'flex', color: 'inherit' }}>
                    <Icon name={item.glyph} size={15} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {item.label()}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {renderView(activeTab)}
        </div>

      </div>
    </VerumContext.Provider>
  )
}

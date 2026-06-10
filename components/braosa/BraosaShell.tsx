'use client'
import { useState, createContext, useContext } from 'react'
import { Icon } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useLang, L } from '@/lib/i18n'
import DashboardView from './views/DashboardView'
import ProductsView from './views/ProductsView'
import ContentView from './views/ContentView'
import KPIsView from './views/KPIsView'

type BraosaTab = 'dashboard' | 'products' | 'content' | 'kpis'

export type BraosaContextValue = {
  navigateTo: (tab: BraosaTab) => void
}

export const BraosaContext = createContext<BraosaContextValue>({ navigateTo: () => {} })
export function useBraosa() { return useContext(BraosaContext) }

const BRAOSA_TABS = [
  { id: 'dashboard' as const, label: () => L('Dashboard',  'Dashboard'), glyph: 'grid'       as const },
  { id: 'products'  as const, label: () => L('Produtos',   'Products'),  glyph: 'wand'       as const },
  { id: 'content'   as const, label: () => L('Conteúdo',   'Content'),   glyph: 'edit'       as const },
  { id: 'kpis'      as const, label: () => L('KPIs',       'KPIs'),      glyph: 'chart-line' as const },
]

function renderView(tab: BraosaTab) {
  switch (tab) {
    case 'dashboard': return <DashboardView />
    case 'products':  return <ProductsView />
    case 'content':   return <ContentView />
    case 'kpis':      return <KPIsView />
  }
}

export default function BraosaShell() {
  useLang()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<BraosaTab>('dashboard')

  const navigateTo = (tab: BraosaTab) => setActiveTab(tab)

  return (
    <BraosaContext.Provider value={{ navigateTo }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>

        {/* Mobile tab bar */}
        {isMobile && (
          <div
            className="hide-scrollbar"
            style={{
              display: 'flex',
              overflowX: 'auto',
              borderBottom: '1px solid var(--edge-soft)',
              flexShrink: 0,
              height: 48,
            }}
          >
            {BRAOSA_TABS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    color: isActive ? 'var(--c-braosa)' : 'var(--ink-dim)',
                    borderBottom: isActive ? '2px solid var(--c-braosa)' : '2px solid transparent',
                  }}
                >
                  <Icon name={item.glyph} size={14} />
                  {item.label()}
                </button>
              )
            })}
          </div>
        )}

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
                background: 'var(--c-braosa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'oklch(0.18 0.01 80)',
                flexShrink: 0,
              }}>
                BT
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-faint)',
                letterSpacing: '0.18em',
              }}>
                BRAOSA
              </div>
            </div>

            {BRAOSA_TABS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
                      ? 'color-mix(in oklch, var(--c-braosa) 14%, transparent)'
                      : 'transparent',
                    color: isActive ? 'var(--c-braosa)' : 'var(--ink-dim)',
                    borderLeft: isActive ? '2px solid var(--c-braosa)' : '2px solid transparent',
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
    </BraosaContext.Provider>
  )
}

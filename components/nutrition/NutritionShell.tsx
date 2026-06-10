'use client'
import { useState, createContext, useContext } from 'react'
import { Icon } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useLang, L } from '@/lib/i18n'
import DiaryView from './views/DiaryView'
import LogFoodView from './views/LogFoodView'
import ProgressView from './views/ProgressView'
import FoodsView from './views/FoodsView'
import GoalsView from './views/GoalsView'
import type { IconName } from '@/lib/icons'

type NutritionTab = 'diary' | 'log' | 'progress' | 'foods' | 'profile'

export type NutritionContextValue = {
  activeTab: NutritionTab
  navigateTo: (tab: NutritionTab, date?: string, meal?: string) => void
  logDate: string
  logMeal: string
}

export const NutritionContext = createContext<NutritionContextValue>({
  activeTab: 'diary',
  navigateTo: () => {},
  logDate: new Date().toISOString().split('T')[0],
  logMeal: 'breakfast',
})
export function useNutrition() { return useContext(NutritionContext) }

const NAV_ITEMS: { id: NutritionTab; label_pt: string; label_en: string; glyph: IconName }[] = [
  { id: 'diary',    label_pt: 'Diário',    label_en: 'Diary',    glyph: 'calendar'     },
  { id: 'log',      label_pt: 'Registar',  label_en: 'Log Food', glyph: 'plus'         },
  { id: 'progress', label_pt: 'Progresso', label_en: 'Progress', glyph: 'trending-up'  },
  { id: 'foods',    label_pt: 'Alimentos', label_en: 'Foods',    glyph: 'search'       },
  { id: 'profile',  label_pt: 'Objetivos', label_en: 'Goals',    glyph: 'target'       },
]

function renderView(tab: NutritionTab) {
  switch (tab) {
    case 'diary':    return <DiaryView />
    case 'log':      return <LogFoodView />
    case 'progress': return <ProgressView />
    case 'foods':    return <FoodsView />
    case 'profile':  return <GoalsView />
  }
}

export default function NutritionShell() {
  useLang()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<NutritionTab>('diary')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [logMeal, setLogMeal] = useState('breakfast')

  const navigateTo = (tab: NutritionTab, date?: string, meal?: string) => {
    if (date) setLogDate(date)
    if (meal) setLogMeal(meal)
    setActiveTab(tab)
  }

  return (
    <NutritionContext.Provider value={{ activeTab, navigateTo, logDate, logMeal }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflow: 'hidden' }}>

        {/* ── Desktop sidebar ── */}
        {!isMobile && (
          <aside style={{
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid var(--edge-soft)',
            padding: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--ink-faint)',
              padding: '0 20px',
              marginBottom: 12,
            }}>
              {L('NUTRIÇÃO', 'NUTRITION')}
            </div>
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 20px',
                    cursor: 'pointer',
                    border: 'none',
                    background: isActive ? 'var(--c-cal-dim)' : 'transparent',
                    color: isActive ? 'var(--c-cal)' : 'var(--ink-dim)',
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? '2px solid var(--c-cal)' : '2px solid transparent',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  <Icon name={item.glyph} size={14} />
                  {L(item.label_pt, item.label_en)}
                </button>
              )
            })}
          </aside>
        )}

        {/* ── Mobile tab bar ── */}
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
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 16px',
                    height: '100%',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    color: isActive ? 'var(--c-cal)' : 'var(--ink-dim)',
                    borderBottom: isActive ? '2px solid var(--c-cal)' : '2px solid transparent',
                  }}
                >
                  <Icon name={item.glyph} size={14} />
                  {L(item.label_pt, item.label_en)}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {renderView(activeTab)}
        </div>
      </div>
    </NutritionContext.Provider>
  )
}

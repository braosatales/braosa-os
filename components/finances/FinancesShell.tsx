'use client'
import { useState } from 'react'
import { Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import type { FinanceTab } from '@/lib/finance'
import OverviewView from './views/OverviewView'
import AccountsView from './views/AccountsView'
import DebtView from './views/DebtView'
import InvestView from './views/InvestView'
import BudgetView from './views/BudgetView'
import BabyStepsView from './views/BabyStepsView'

const FINANCE_TABS = [
  { id: "overview",  label: () => L("Visão Geral","Overview"),   glyph: "chart-line",    color: "var(--c-fin)"  },
  { id: "accounts",  label: () => L("Contas","Accounts"),        glyph: "bank",          color: "var(--c-fin)"  },
  { id: "debt",      label: () => L("Dívidas","Debt"),           glyph: "trending-down", color: "var(--neg)"    },
  { id: "invest",    label: () => L("Investimentos","Invest"),   glyph: "trending-up",   color: "var(--pos)"    },
  { id: "budget",    label: () => L("Orçamento","Budget"),       glyph: "chart-bar",     color: "var(--c-fin)"  },
  { id: "babysteps", label: () => L("Baby Steps","Baby Steps"),  glyph: "target",        color: "var(--c-task)" },
] as const

function renderView(tab: FinanceTab) {
  switch (tab) {
    case "overview":  return <OverviewView />
    case "accounts":  return <AccountsView />
    case "debt":      return <DebtView />
    case "invest":    return <InvestView />
    case "budget":    return <BudgetView />
    case "babysteps": return <BabyStepsView />
  }
}

export default function FinancesShell() {
  useLang()
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview")

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left sidebar */}
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
          {L("FINANÇAS", "FINANCES")}
        </div>

        {FINANCE_TABS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              className="subnav-item"
              onClick={() => setActiveTab(item.id as FinanceTab)}
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
                  ? `color-mix(in oklch, ${item.color} 14%, transparent)`
                  : 'transparent',
                color: isActive ? item.color : 'var(--ink-dim)',
                borderLeft: isActive ? `2px solid ${item.color}` : '2px solid transparent',
                transition: 'all .15s',
              }}
            >
              <span style={{ display: 'flex', color: 'inherit' }}>
                <Icon name={item.glyph} size={15} />
              </span>
              <span
                className="subnav-label"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                {item.label()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {renderView(activeTab)}
      </div>
    </div>
  )
}

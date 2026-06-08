'use client'

import { useState, useEffect } from 'react'

type Budget = { category: string; month_limit: number }
type Summary = { budgets: Budget[] }

export default function BudgetWidget() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/finances/summary')
      .then(r => r.json())
      .then((d: Summary) => setBudgets((d.budgets ?? []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Loading…</div>

  if (!budgets.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No budgets configured</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {budgets.map(b => (
        <div key={b.category}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 5 }}>
            <span style={{ textTransform: 'capitalize' }}>{b.category}</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-dim)' }}>
              €{Number(b.month_limit).toLocaleString()} limit
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '0%', background: 'var(--c-fin)', borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

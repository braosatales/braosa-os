'use client'
import { useState, useEffect } from 'react'
import { useLang, L } from '@/lib/i18n'
import { useFinanceStore } from '@/lib/finance-store'
import { Icon } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export default function BabyStepsView() {
  useLang()
  const isMobile = useIsMobile()
  const { data } = useFinanceStore()
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const initial: Record<number, boolean> = {}
    for (const n of [4, 5, 6, 7]) {
      initial[n] = localStorage.getItem(`braosa-babysteps-${n}`) === 'true'
    }
    setChecked(initial)
  }, [])

  const totalCash = data?.totals.totalCash ?? 0
  const totalDebt = data?.totals.totalDebt ?? 0
  const totalMonthlyBudget = data?.budgets.reduce(
    (s, b) => b.period === 'monthly' ? s + b.limit_amount : s, 0
  ) ?? 0

  const STEPS = [
    {
      n: 1,
      title: L('Fundo de Emergência Inicial', 'Starter Emergency Fund'),
      desc: L('Poupa 1.000 € para emergências.', 'Save €1,000 for emergencies.'),
    },
    {
      n: 2,
      title: L('Liquidar Dívidas', 'Pay Off Debt'),
      desc: L('Paga todas as dívidas exceto a hipoteca.', 'Pay off all debt except mortgage.'),
    },
    {
      n: 3,
      title: L('Fundo de Emergência Completo', 'Full Emergency Fund'),
      desc: L('Poupa 3 a 6 meses de despesas.', 'Save 3–6 months of expenses.'),
    },
    {
      n: 4,
      title: L('Investir 15%', 'Invest 15%'),
      desc: L('Investe 15% do rendimento para a reforma.', 'Invest 15% of income for retirement.'),
    },
    {
      n: 5,
      title: L('Educação dos Filhos', "Children's Education"),
      desc: L('Poupa para a educação universitária.', 'Save for college.'),
    },
    {
      n: 6,
      title: L('Pagar Casa', 'Pay Off Home'),
      desc: L('Paga a hipoteca antecipadamente.', 'Pay off your home early.'),
    },
    {
      n: 7,
      title: L('Construir Riqueza', 'Build Wealth'),
      desc: L('Constrói riqueza e sê generoso.', 'Build wealth and be generous.'),
    },
  ]

  function isStepDone(n: number): boolean {
    if (n === 1) return totalCash >= 1000
    if (n === 2) return totalDebt === 0
    if (n === 3) return totalCash >= totalMonthlyBudget * 4
    return checked[n] ?? false
  }

  function getProgress(n: number): number {
    if (n === 1) return Math.min(totalCash / 1000, 1)
    if (n === 2) return totalDebt === 0 ? 1 : 0.05
    return Math.min(totalCash / (totalMonthlyBudget * 4 || 1), 1)
  }

  const activeN = STEPS.find(s => !isStepDone(s.n))?.n ?? -1

  function toggleChecked(n: number) {
    setChecked(prev => {
      const next = { ...prev, [n]: !prev[n] }
      localStorage.setItem(`braosa-babysteps-${n}`, String(next[n]))
      return next
    })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        Baby Steps
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 32 }}>
        {L('O caminho para a liberdade financeira.', 'The path to financial freedom.')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STEPS.map(step => {
          const done = isStepDone(step.n)
          const isActive = activeN === step.n
          const isChecked = checked[step.n] ?? false

          return (
            <div
              key={step.n}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                background: 'var(--bg-raised)',
                border: `1px solid ${isActive ? 'var(--c-fin)' : 'var(--edge)'}`,
                borderRadius: 'var(--radius)',
                padding: '20px 22px',
                position: 'relative',
                boxShadow: isActive ? '0 0 calc(20px * var(--glow)) -8px var(--c-fin)' : undefined,
              }}
            >
              {/* Number circle */}
              <div style={{
                flexShrink: 0,
                width: isMobile ? 44 : 36,
                height: isMobile ? 44 : 36,
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 700,
                background: done ? 'var(--pos)' : isActive ? 'var(--c-fin-dim)' : 'var(--bg-inset)',
                border: done ? 'none' : isActive ? '2px solid var(--c-fin)' : '1px solid var(--edge)',
                color: 'oklch(0.18 0.01 80)',
              }}>
                {done ? (
                  <span style={{ color: 'oklch(0.18 0.01 80)', display: 'flex' }}>
                    <Icon name="check" size={16} />
                  </span>
                ) : (
                  <span style={{ color: isActive ? 'var(--c-fin)' : 'var(--ink-faint)' }}>
                    {step.n}
                  </span>
                )}
              </div>

              {/* Center */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
                  {step.desc}
                </div>
                {step.n <= 3 && (
                  <div style={{ marginTop: 10, height: 5, borderRadius: 99, background: 'var(--bg-inset)' }}>
                    <div style={{
                      width: getProgress(step.n) * 100 + '%',
                      height: '100%',
                      borderRadius: 99,
                      background: done ? 'var(--pos)' : 'var(--c-fin)',
                      transition: 'width .5s',
                    }} />
                  </div>
                )}
              </div>

              {/* Checkbox for steps 4–7 */}
              {step.n >= 4 && (
                <div
                  onClick={() => toggleChecked(step.n)}
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    border: '1px solid var(--edge)',
                    background: isChecked ? 'var(--pos)' : 'var(--bg-inset)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isChecked && (
                    <span style={{ color: 'oklch(0.18 0.01 80)', display: 'flex' }}>
                      <Icon name="check" size={13} />
                    </span>
                  )}
                </div>
              )}

              {/* Active step badge */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--c-fin)',
                  letterSpacing: '0.14em',
                  background: 'var(--c-fin-dim)',
                  borderRadius: 5,
                  padding: '2px 8px',
                }}>
                  {L('PASSO ATUAL', 'CURRENT STEP')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useLang, L, getLang } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { useFinanceStore, FinanceStore } from '@/lib/finance-store'
import { Icon, Ring, EmptyState } from '@/components/ui'
import type { Budget } from '@/lib/finance'
import AddBudgetModal from '../modals/AddBudgetModal'
import EditBudgetModal from '../modals/EditBudgetModal'

export default function BudgetView() {
  useLang()
  const { data } = useFinanceStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editBudget, setEditBudget] = useState<Budget | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const budgets = data?.budgets ?? []

  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const totalLimit = budgets.reduce((s, b) => s + b.limit_amount, 0)
  const healthRatio = totalLimit > 0 ? totalSpent / totalLimit : 0
  const ringColor = healthRatio < 0.8 ? 'var(--pos)' : healthRatio <= 1.0 ? 'var(--c-fin)' : 'var(--neg)'

  const monthLabel = new Intl.DateTimeFormat(getLang() === 'en' ? 'en-IE' : 'pt-PT', {
    month: 'long', year: 'numeric',
  }).format(currentMonth)

  function prevMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const overBudget = budgets.filter(b => b.spent > b.limit_amount)

  const periodLabel = (p: Budget['period']) => {
    if (p === 'monthly') return L('mensal', 'monthly')
    if (p === 'weekly') return L('semanal', 'weekly')
    return L('anual', 'yearly')
  }

  async function handleDelete(id: string) {
    if (!confirm(L('Apagar esta categoria? Esta ação não pode ser desfeita.', 'Delete this category? This cannot be undone.'))) return
    await FinanceStore.deleteBudget(id)
  }

  return (
    <div className="ov-split">
      {/* Left: Budget list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
            {L('Orçamento', 'Budget')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn"
              style={{ width: 28, height: 28, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
              onClick={prevMonth}
            >
              <Icon name="chevron-left" size={12} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
              {monthLabel}
            </span>
            <button
              className="btn"
              style={{ width: 28, height: 28, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
              onClick={nextMonth}
            >
              <Icon name="chevron-right" size={12} />
            </button>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} />
            {L('+ Adicionar', '+ Add')}
          </button>
        </div>

        {budgets.length === 0 ? (
          <EmptyState icon="chart-bar" title={L('Sem categorias', 'No budget categories')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {budgets.map(budget => {
              const ratio = budget.limit_amount > 0 ? budget.spent / budget.limit_amount : 0
              const fillPct = Math.min(ratio, 1) * 100
              const fillColor = ratio < 0.7
                ? 'var(--pos)'
                : budget.spent < budget.limit_amount
                  ? 'var(--c-fin)'
                  : 'linear-gradient(90deg, var(--c-fin), var(--neg))'
              const overLimit = budget.spent >= budget.limit_amount

              return (
                <div
                  key={budget.id}
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--edge)',
                    borderRadius: 'var(--radius)',
                    padding: '16px 18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                      {budget.category}
                    </span>
                    <span style={{
                      display: 'inline-flex', fontSize: 10, padding: '2px 8px', borderRadius: 5,
                      background: 'var(--bg-raised-2)', color: 'var(--ink-faint)',
                    }}>
                      {periodLabel(budget.period)}
                    </span>
                    <div className="tnum" style={{ fontSize: 13, display: 'flex', gap: 4 }}>
                      <span style={{ color: budget.spent > budget.limit_amount ? 'var(--neg)' : 'var(--pos)', fontWeight: 600 }}>
                        {fmt.eur(budget.spent)}
                      </span>
                      <span style={{ color: 'var(--ink-faint)' }}>/</span>
                      <span style={{ color: 'var(--ink-dim)' }}>{fmt.eur(budget.limit_amount)}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, marginBottom: 8, height: 8, borderRadius: 99, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                    <div style={{
                      width: fillPct + '%',
                      height: '100%',
                      borderRadius: 'inherit',
                      background: fillColor,
                      transition: 'width .4s cubic-bezier(.2,.8,.2,1)',
                      boxShadow: overLimit ? '0 0 calc(8px * var(--glow)) var(--neg)' : undefined,
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: overLimit ? 'var(--neg)' : 'var(--pos)' }}>
                      {overLimit
                        ? L(`${fmt.eur(budget.spent - budget.limit_amount)} acima do limite`, `${fmt.eur(budget.spent - budget.limit_amount)} over budget`)
                        : L(`Faltam ${fmt.eur(budget.limit_amount - budget.spent)}`, `${fmt.eur(budget.limit_amount - budget.spent)} remaining`)
                      }
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn"
                        style={{ height: 28, padding: '0 10px' }}
                        onClick={() => setEditBudget(budget)}
                      >
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        className="btn"
                        style={{ height: 28, padding: '0 10px' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--neg)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '' }}
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right rail */}
      <div className="fin-rail">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Ring value={Math.min(healthRatio, 1)} color={ringColor} size={80} stroke={7}>
            <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
              {Math.round(healthRatio * 100)}%
            </span>
          </Ring>
          <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            {L('do orçamento usado', 'of budget used')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-dim)' }}>{L('Total orçamentado', 'Total budgeted')}</span>
            <span className="tnum" style={{ color: 'var(--ink-dim)' }}>{fmt.eur(totalLimit)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-dim)' }}>{L('Total gasto', 'Total spent')}</span>
            <span className="tnum" style={{ color: 'var(--ink-soft)' }}>{fmt.eur(totalSpent)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-dim)' }}>{L('Restante', 'Remaining')}</span>
            <span className="tnum" style={{ color: totalSpent <= totalLimit ? 'var(--pos)' : 'var(--neg)' }}>
              {fmt.eur(totalLimit - totalSpent)}
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--edge-soft)', margin: '12px 0' }} />

        <div style={{ fontSize: 12 }}>
          {overBudget.length === 0 ? (
            <span style={{ color: 'var(--pos)' }}>
              {L('Tudo dentro do orçamento 🎉', 'All within budget 🎉')}
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {overBudget.map(b => (
                <div key={b.id}>
                  <span style={{ color: 'var(--neg)', fontSize: 12 }}>{b.category}</span>
                  <span style={{ color: 'var(--neg)', fontSize: 11 }}>
                    {L(` ${fmt.eur(b.spent - b.limit_amount)} acima`, ` ${fmt.eur(b.spent - b.limit_amount)} over`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddBudgetModal open={showAdd} onClose={() => setShowAdd(false)} />
      {editBudget && <EditBudgetModal budget={editBudget} onClose={() => setEditBudget(null)} />}
    </div>
  )
}

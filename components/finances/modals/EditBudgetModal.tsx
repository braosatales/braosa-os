'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'
import { FinanceStore } from '@/lib/finance-store'
import type { Budget } from '@/lib/finance'

type Props = {
  budget: Budget
  onClose: () => void
}

const PERIODS: { value: Budget['period']; pt: string; en: string }[] = [
  { value: 'monthly', pt: 'mensal', en: 'monthly' },
  { value: 'weekly',  pt: 'semanal', en: 'weekly' },
  { value: 'yearly',  pt: 'anual',   en: 'yearly' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-inset)',
  border: '1px solid var(--edge)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 13px',
  fontSize: 14,
  color: 'var(--ink)',
  outline: 'none',
}

export default function EditBudgetModal({ budget, onClose }: Props) {
  useLang()
  const [category, setCategory] = useState(budget.category)
  const [limit, setLimit] = useState(String(budget.limit_amount))
  const [spent, setSpent] = useState(String(budget.spent))
  const [period, setPeriod] = useState<Budget['period']>(budget.period)
  const [logAmount, setLogAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [logLoading, setLogLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await FinanceStore.updateBudget(budget.id, {
        category,
        limit_amount: parseFloat(limit) || 0,
        spent: parseFloat(spent) || 0,
        period,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleLogExpense() {
    const amount = parseFloat(logAmount)
    if (!amount) return
    setLogLoading(true)
    try {
      await fetch(`/api/finances/budgets/${budget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spent: budget.spent + amount }),
      })
      FinanceStore.invalidate()
      onClose()
    } finally {
      setLogLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(L('Apagar esta categoria? Esta ação não pode ser desfeita.', 'Delete this category? This cannot be undone.'))) return
    await FinanceStore.deleteBudget(budget.id)
    onClose()
  }

  return (
    <Modal open onClose={onClose} width={420}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Editar Categoria', 'Edit Category')}
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Categoria', 'Category')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--c-fin)' } as React.CSSProperties}
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Limite', 'Limit')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-fin)' } as React.CSSProperties}
                type="number"
                step="0.01"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder="0,00"
              />
              <span style={{ fontSize: 13, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>€</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Gasto', 'Spent')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--c-fin)' } as React.CSSProperties}
              type="number"
              step="0.01"
              value={spent}
              onChange={e => setSpent(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Período', 'Period')}
            </label>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    background: period === p.value ? 'var(--c-fin-dim)' : 'var(--bg-raised-2)',
                    border: `1px solid ${period === p.value ? 'var(--c-fin)' : 'var(--edge)'}`,
                    color: period === p.value ? 'var(--c-fin)' : 'var(--ink-dim)',
                    transition: 'background .15s, border-color .15s, color .15s',
                  }}
                >
                  {L(p.pt, p.en)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--edge-soft)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 8 }}>
              {L('Adicionar ao gasto', 'Log expense amount')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-fin)', flex: 1 } as React.CSSProperties}
                type="number"
                step="0.01"
                value={logAmount}
                onChange={e => setLogAmount(e.target.value)}
                placeholder="0,00"
              />
              <button
                type="button"
                className="btn"
                onClick={handleLogExpense}
                disabled={logLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {L('Registar', 'Log')}
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="submit"
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
            disabled={loading}
          >
            {L('Guardar', 'Save')}
          </button>
          <button
            type="button"
            className="btn"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--neg)' }}
            onClick={handleDelete}
          >
            {L('Apagar categoria', 'Delete category')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

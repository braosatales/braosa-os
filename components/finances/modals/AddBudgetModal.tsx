'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'
import { FinanceStore } from '@/lib/finance-store'
import type { Budget } from '@/lib/finance'

type Props = {
  open: boolean
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

export default function AddBudgetModal({ open, onClose }: Props) {
  useLang()
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('')
  const [spent, setSpent] = useState('0')
  const [period, setPeriod] = useState<Budget['period']>('monthly')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await FinanceStore.addBudget({
        category,
        limit_amount: parseFloat(limit) || 0,
        spent: parseFloat(spent) || 0,
        period,
      })
      setCategory(''); setLimit(''); setSpent('0'); setPeriod('monthly')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Adicionar Categoria', 'Add Category')}
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
              placeholder={L('Ex: Alimentação', 'e.g. Groceries')}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Limite mensal', 'Monthly limit')}
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
              {L('Gasto até agora', 'Spent so far')}
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
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <button
            type="submit"
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
            disabled={loading}
          >
            {L('Adicionar', 'Add Category')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

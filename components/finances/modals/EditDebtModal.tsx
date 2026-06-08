'use client'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'
import { FinanceStore } from '@/lib/finance-store'
import type { Debt } from '@/lib/finance'

type Props = {
  debt: Debt | null
  onClose: () => void
}

const KINDS = [
  { value: 'Credit Card', pt: 'Cartão de Crédito' },
  { value: 'Vehicle',     pt: 'Veículo' },
  { value: 'Education',   pt: 'Educação' },
  { value: 'Mortgage',    pt: 'Hipoteca' },
  { value: 'Other',       pt: 'Outro' },
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

export default function EditDebtModal({ debt, onClose }: Props) {
  useLang()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('Credit Card')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [payoffDate, setPayoffDate] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!debt) return
    setName(debt.name)
    setKind(debt.kind)
    setBalance(String(debt.balance))
    setRate(String(debt.rate))
    setMinPayment(String(debt.min_payment))
    setPayoffDate(debt.payoff_date ?? '')
  }, [debt])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!debt) return
    setLoading(true)
    try {
      await FinanceStore.updateDebt(debt.id, {
        name,
        kind,
        balance: parseFloat(balance) || 0,
        rate: parseFloat(rate) || 0,
        min_payment: parseFloat(minPayment) || 0,
        payoff_date: payoffDate || null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!debt) return
    if (!confirm(L('Apagar esta dívida? Esta ação não pode ser desfeita.', 'Delete this debt? This cannot be undone.'))) return
    setLoading(true)
    try {
      await FinanceStore.deleteDebt(debt.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={debt !== null} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Editar Dívida', 'Edit Debt')}
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Nome', 'Name')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--neg)' } as React.CSSProperties}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Tipo', 'Kind')}
            </label>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
              {KINDS.map(k => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    background: kind === k.value ? 'color-mix(in oklch, var(--neg) 14%, transparent)' : 'var(--bg-raised-2)',
                    border: `1px solid ${kind === k.value ? 'var(--neg)' : 'var(--edge)'}`,
                    color: kind === k.value ? 'var(--neg)' : 'var(--ink-dim)',
                    transition: 'background .15s, border-color .15s, color .15s',
                  }}
                >
                  {L(k.pt, k.value)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Saldo', 'Balance')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--neg)' } as React.CSSProperties}
              type="number"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Taxa de juro', 'Interest rate')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--neg)' } as React.CSSProperties}
                type="number"
                step="0.1"
                value={rate}
                onChange={e => setRate(e.target.value)}
              />
              <span style={{ fontSize: 13, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>% APR</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Pagamento mínimo', 'Min payment')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--neg)' } as React.CSSProperties}
                type="number"
                step="0.01"
                value={minPayment}
                onChange={e => setMinPayment(e.target.value)}
              />
              <span style={{ fontSize: 13, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>{L('/mês', '/month')}</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Data de liquidação (opcional)', 'Payoff date (optional)')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--neg)' } as React.CSSProperties}
              type="date"
              value={payoffDate}
              onChange={e => setPayoffDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="submit"
            className="btn btn-accent"
            style={{ '--accent': 'var(--neg)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
            disabled={loading}
          >
            {L('Guardar', 'Save')}
          </button>
          <button
            type="button"
            className="btn"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--neg)' }}
            disabled={loading}
            onClick={handleDelete}
          >
            {L('Apagar Dívida', 'Delete Debt')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

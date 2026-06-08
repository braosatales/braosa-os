'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'

type Props = {
  open: boolean
  accountId: string
  onClose: () => void
  onAdded: () => void
}

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

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AddTransactionModal({ open, accountId, onClose, onAdded }: Props) {
  useLang()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [sign, setSign] = useState<-1 | 1>(-1)
  const [date, setDate] = useState(todayISO)
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/finances/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          date,
          description,
          amount: sign * parseFloat(amount),
          category: category || null,
          notes: notes || null,
        }),
      })
      setDescription(''); setAmount(''); setSign(-1); setDate(todayISO()); setCategory(''); setNotes('')
      onAdded()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Nova Transação', 'New Transaction')}
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Descrição', 'Description')}
            </label>
            <input
              className="glow-focus"
              style={inputStyle}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Montante', 'Amount')}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--edge)', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setSign(-1)}
                  style={{
                    padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none',
                    background: sign === -1 ? 'oklch(0.66 0.13 30 / 0.18)' : 'var(--bg-raised-2)',
                    color: sign === -1 ? 'var(--neg)' : 'var(--ink-dim)',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  {L('Despesa', 'Expense')}
                </button>
                <button
                  type="button"
                  onClick={() => setSign(1)}
                  style={{
                    padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none',
                    background: sign === 1 ? 'oklch(0.76 0.10 152 / 0.18)' : 'var(--bg-raised-2)',
                    color: sign === 1 ? 'var(--pos)' : 'var(--ink-dim)',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  {L('Receita', 'Income')}
                </button>
              </div>
              <input
                className="glow-focus"
                style={{ ...inputStyle, flex: 1 }}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Data', 'Date')}
            </label>
            <input
              className="glow-focus"
              style={inputStyle}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Categoria', 'Category')}
            </label>
            <input
              className="glow-focus"
              style={inputStyle}
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder={L('Ex: Alimentação', 'e.g. Food')}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Notas', 'Notes')}
            </label>
            <textarea
              className="glow-focus"
              style={{ ...inputStyle, resize: 'none', minHeight: 72 }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={L('Opcional...', 'Optional...')}
            />
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <button
            type="submit"
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
            disabled={loading}
          >
            {L('Adicionar Transação', 'Add Transaction')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

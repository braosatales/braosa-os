'use client'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'
import { FinanceStore } from '@/lib/finance-store'
import type { Investment } from '@/lib/finance'

type Props = {
  investment: Investment | null
  onClose: () => void
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

export default function EditInvestmentModal({ investment, onClose }: Props) {
  useLang()
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [dayChange, setDayChange] = useState('')
  const [allocation, setAllocation] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!investment) return
    setName(investment.name)
    setInstitution(investment.institution)
    setCurrentValue(String(investment.current_value))
    setDayChange(investment.day_change_pct !== null ? String(investment.day_change_pct) : '')
    setAllocation(investment.allocation ?? '')
  }, [investment])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!investment) return
    setLoading(true)
    try {
      await FinanceStore.updateInvestment(investment.id, {
        name,
        institution,
        current_value: parseFloat(currentValue) || 0,
        day_change_pct: dayChange ? parseFloat(dayChange) : null,
        allocation: allocation || null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!investment) return
    if (!confirm(L('Apagar este investimento? Esta ação não pode ser desfeita.', 'Delete this investment? This cannot be undone.'))) return
    setLoading(true)
    try {
      await FinanceStore.deleteInvestment(investment.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={investment !== null} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Editar Investimento', 'Edit Investment')}
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Nome', 'Name')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--pos)' } as React.CSSProperties}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Instituição', 'Institution')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--pos)' } as React.CSSProperties}
              value={institution}
              onChange={e => setInstitution(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Valor atual', 'Current value')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--pos)' } as React.CSSProperties}
              type="number"
              step="0.01"
              value={currentValue}
              onChange={e => setCurrentValue(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Variação diária % (opcional)', 'Day change % (optional)')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--pos)' } as React.CSSProperties}
                type="number"
                step="0.01"
                value={dayChange}
                onChange={e => setDayChange(e.target.value)}
              />
              <span style={{ fontSize: 13, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>%</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Alocação (opcional)', 'Allocation (optional)')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--pos)' } as React.CSSProperties}
              value={allocation}
              onChange={e => setAllocation(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="submit"
            className="btn btn-accent"
            style={{ '--accent': 'var(--pos)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
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
            {L('Apagar Investimento', 'Delete Investment')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

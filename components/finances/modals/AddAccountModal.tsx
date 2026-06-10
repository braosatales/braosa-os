'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'
import { FinanceStore } from '@/lib/finance-store'
import type { Account } from '@/lib/finance'

type Props = {
  open: boolean
  onClose: () => void
}

const TYPES: { value: Account['type']; pt: string; en: string }[] = [
  { value: 'checking',   pt: 'Conta à Ordem', en: 'Checking' },
  { value: 'savings',    pt: 'Poupança',       en: 'Savings' },
  { value: 'investment', pt: 'Investimento',   en: 'Investment' },
  { value: 'other',      pt: 'Outro',          en: 'Other' },
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

export default function AddAccountModal({ open, onClose }: Props) {
  useLang()
  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [balance, setBalance] = useState('')
  const [type, setType] = useState<Account['type']>('checking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await FinanceStore.addAccount({ name, bank, balance: parseFloat(balance) || 0, type })
      setName(''); setBank(''); setBalance(''); setType('checking')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Erro ao guardar', 'Failed to save'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Adicionar Conta', 'Add Account')}
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Nome', 'Name')}
            </label>
            <input
              className="glow-focus"
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={L('Ex: Conta à Ordem', 'e.g. Checking Account')}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Banco', 'Bank')}
            </label>
            <input
              className="glow-focus"
              style={inputStyle}
              value={bank}
              onChange={e => setBank(e.target.value)}
              placeholder={L('Ex: Millennium BCP', 'e.g. Barclays')}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Saldo inicial', 'Initial balance')}
            </label>
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--c-fin)' } as React.CSSProperties}
              type="number"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 5 }}>
              {L('Tipo', 'Type')}
            </label>
            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    background: type === t.value ? 'var(--c-fin-dim)' : 'var(--bg-raised-2)',
                    border: `1px solid ${type === t.value ? 'var(--c-fin)' : 'var(--edge)'}`,
                    color: type === t.value ? 'var(--c-fin)' : 'var(--ink-dim)',
                    transition: 'background .15s, border-color .15s, color .15s',
                  }}
                >
                  {L(t.pt, t.en)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          {error && (
            <div style={{ color: 'var(--neg)', fontSize: 12, marginBottom: 10 }}>{error}</div>
          )}
          <button
            type="submit"
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
            disabled={loading}
          >
            {L('Adicionar Conta', 'Add Account')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

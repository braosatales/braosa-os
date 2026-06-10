'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { KPI_META } from '@/lib/braosa'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const KPI_OPTIONS = [
  ...Object.entries(KPI_META).map(([key, meta]) => ({ value: key, label: meta.label_pt, label_en: meta.label_en })),
  { value: 'custom', label: 'Personalizado', label_en: 'Custom' },
]

export default function AddKPIModal({ open, onClose, onSaved }: Props) {
  useLang()
  const [metric, setMetric] = useState('total_users')
  const [value, setValue] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!value) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/braosa/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric, value: Number(value), date, label: metric === 'custom' ? customLabel : undefined }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      onClose()
      setValue('')
      setCustomLabel('')
    } catch {
      setError(L('Erro ao guardar', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-inset)',
    border: '1px solid var(--edge)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em',
    color: 'var(--ink-faint)',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {L('Adicionar KPI', 'Add KPI')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{L('MÉTRICA', 'METRIC')}</label>
            <select value={metric} onChange={e => setMetric(e.target.value)} style={inputStyle}>
              {KPI_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {L(o.label, o.label_en)}
                </option>
              ))}
            </select>
          </div>

          {metric === 'custom' && (
            <div>
              <label style={labelStyle}>{L('NOME PERSONALIZADO', 'CUSTOM NAME')}</label>
              <input
                type="text"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder={L('Ex: Seguidores Instagram', 'E.g. Instagram followers')}
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>{L('VALOR', 'VALUE')}</label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{L('DATA', 'DATE')}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--neg)' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            {L('Cancelar', 'Cancel')}
          </button>
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-braosa)' } as React.CSSProperties}
            onClick={handleSave}
            disabled={saving || !value}
          >
            {saving ? L('A guardar…', 'Saving…') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

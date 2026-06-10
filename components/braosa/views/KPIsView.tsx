'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { KPI_META } from '@/lib/braosa'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import AddKPIModal from '../modals/AddKPIModal'

type KpiRow = {
  id: string
  date: string
  metric: string
  value: number
  label: string | null
  source: string
}

function formatValue(metric: string, value: number): string {
  const meta = KPI_META[metric]
  if (!meta) return fmt.num(value)
  if (meta.format === 'currency') return fmt.eurk(value)
  if (meta.format === 'number') return fmt.num(value)
  return String(value)
}

const KPI_OPTIONS = [
  ...Object.entries(KPI_META).map(([key, meta]) => ({ value: key, label_pt: meta.label_pt, label_en: meta.label_en })),
  { value: 'custom', label_pt: 'Personalizado', label_en: 'Custom' },
]

export default function KPIsView() {
  useLang()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<KpiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<KpiRow | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)

  // Manual entry form
  const [formMetric, setFormMetric] = useState('total_users')
  const [formValue, setFormValue] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formLabel, setFormLabel] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const fetchKpis = useCallback(async () => {
    try {
      const res = await fetch('/api/braosa/kpis?period=90d')
      if (!res.ok) return
      const data = await res.json()
      // Flatten history into rows for table display
      const allRows: KpiRow[] = []
      for (const [metric, entries] of Object.entries(data.history as Record<string, { date: string; value: number }[]>)) {
        for (const entry of entries) {
          allRows.push({ id: `${metric}-${entry.date}`, date: entry.date, metric, value: entry.value, label: null, source: 'manual' })
        }
      }
      allRows.sort((a, b) => b.date.localeCompare(a.date))
      setRows(allRows)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  async function handleFormSave() {
    if (!formValue) return
    setFormSaving(true)
    try {
      await fetch('/api/braosa/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: formMetric,
          value: Number(formValue),
          date: formDate,
          label: formMetric === 'custom' ? formLabel : undefined,
        }),
      })
      setFormValue('')
      setFormLabel('')
      await fetchKpis()
    } finally {
      setFormSaving(false)
    }
  }

  async function handleInlineEdit(row: KpiRow) {
    if (!editVal) return
    setSaving(true)
    try {
      await fetch('/api/braosa/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: row.metric, value: Number(editVal), date: row.date }),
      })
      setEditingRow(null)
      setEditVal('')
      await fetchKpis()
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

  // Group rows by date for display
  const byDate = rows.reduce((acc, row) => {
    if (!acc[row.date]) acc[row.date] = []
    acc[row.date].push(row)
    return acc
  }, {} as Record<string, KpiRow[]>)

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left: KPI table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            KPIs
          </div>
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-braosa)' } as React.CSSProperties}
            onClick={() => setAddOpen(true)}
          >
            <Icon name="plus" size={14} />
            {L('Adicionar', 'Add')}
          </button>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
        ) : rows.length === 0 ? (
          <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            {L('Nenhum KPI registado ainda.', 'No KPIs logged yet.')}
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr auto' : '1fr 120px 100px 80px 60px',
              gap: 8, padding: '8px 12px',
              borderBottom: '1px solid var(--edge)',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
              color: 'var(--ink-faint)',
            }}>
              <span>{L('MÉTRICA', 'METRIC')}</span>
              {!isMobile && <span>{L('VALOR', 'VALUE')}</span>}
              {!isMobile && <span>{L('DATA', 'DATE')}</span>}
              {!isMobile && <span>{L('FONTE', 'SOURCE')}</span>}
              <span>{L('EDITAR', 'EDIT')}</span>
            </div>

            {Object.entries(byDate).slice(0, 60).map(([date, dateRows]) => (
              <div key={date}>
                <div style={{
                  padding: '6px 12px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.12em',
                  background: 'var(--bg-inset)',
                  borderBottom: '1px solid var(--edge-soft)',
                }}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {dateRows.map(row => {
                  const meta = KPI_META[row.metric]
                  const isEditing = editingRow?.id === row.id

                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 1fr auto' : '1fr 120px 100px 80px 60px',
                        gap: 8, padding: '10px 12px',
                        borderBottom: '1px solid var(--edge-soft)',
                        alignItems: 'center',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {meta && (
                          <span style={{ color: meta.color, flexShrink: 0 }}>
                            <Icon name={meta.glyph as Parameters<typeof Icon>[0]['name']} size={13} />
                          </span>
                        )}
                        <span style={{ color: 'var(--ink-soft)' }}>
                          {meta ? L(meta.label_pt, meta.label_en) : row.metric}
                          {row.label && <span style={{ color: 'var(--ink-faint)', marginLeft: 4 }}>({row.label})</span>}
                        </span>
                      </div>

                      {!isMobile && (
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontWeight: 600 }}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              autoFocus
                              style={{ width: 80, background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 6, padding: '3px 6px', color: 'var(--ink)', fontSize: 13 }}
                              onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(row); if (e.key === 'Escape') setEditingRow(null) }}
                            />
                          ) : formatValue(row.metric, row.value)}
                        </span>
                      )}

                      {!isMobile && (
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>{row.date}</span>
                      )}

                      {!isMobile && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                          {row.source}
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: 4 }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleInlineEdit(row)}
                              disabled={saving}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pos)', padding: 2, fontSize: 13 }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingRow(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 2, fontSize: 13 }}
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setEditingRow(row); setEditVal(String(row.value)) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2 }}
                          >
                            <Icon name="edit" size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Manual entry panel (desktop) */}
      {!isMobile && (
        <div style={{
          width: 260,
          flexShrink: 0,
          borderLeft: '1px solid var(--edge-soft)',
          padding: '24px 20px',
          overflowY: 'auto',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            {L('Entrada Manual', 'Manual Entry')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('MÉTRICA', 'METRIC')}</label>
              <select value={formMetric} onChange={e => setFormMetric(e.target.value)} style={inputStyle}>
                {KPI_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{L(o.label_pt, o.label_en)}</option>
                ))}
              </select>
            </div>

            {formMetric === 'custom' && (
              <div>
                <label style={labelStyle}>{L('NOME PERSONALIZADO', 'CUSTOM NAME')}</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>{L('VALOR', 'VALUE')}</label>
              <input
                type="number"
                value={formValue}
                onChange={e => setFormValue(e.target.value)}
                placeholder="0"
                style={inputStyle}
                onKeyDown={e => { if (e.key === 'Enter') handleFormSave() }}
              />
            </div>

            <div>
              <label style={labelStyle}>{L('DATA', 'DATE')}</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button
              className="btn btn-accent"
              style={{ '--accent': 'var(--c-braosa)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
              onClick={handleFormSave}
              disabled={formSaving || !formValue}
            >
              {formSaving ? L('A guardar…', 'Saving…') : L('Registar KPI', 'Log KPI')}
            </button>
          </div>
        </div>
      )}

      <AddKPIModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={fetchKpis} />
    </div>
  )
}

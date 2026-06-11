'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip,
} from 'recharts'
import { Modal, Icon, EmptyState } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { fmt } from '@/lib/fmt'
import { formatDate } from '@/lib/date'
import type { VerumProject, VerumFinancial } from '@/lib/verum'

type FinancialsData = {
  entries: VerumFinancial[]
  summary: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    byMonth: { month: string; revenue: number; expenses: number }[]
  }
}

const PERIOD_OPTIONS = [
  { value: '30d',  label_pt: '30 dias', label_en: '30 days' },
  { value: '90d',  label_pt: '90 dias', label_en: '90 days' },
  { value: '1y',   label_pt: '1 ano',   label_en: '1 year' },
]

const TYPE_FILTERS = [
  { value: 'all',     label_pt: 'Todos',     label_en: 'All' },
  { value: 'revenue', label_pt: 'Receita',   label_en: 'Revenue' },
  { value: 'expense', label_pt: 'Despesa',   label_en: 'Expense' },
  { value: 'invoice', label_pt: 'Fatura',    label_en: 'Invoice' },
  { value: 'payroll', label_pt: 'Salários',  label_en: 'Payroll' },
]

const TYPE_COLORS: Record<string, string> = {
  revenue: 'var(--pos)',
  invoice: 'var(--c-fin)',
  expense: 'var(--neg)',
  payroll: 'var(--neg)',
}

// ─── AddFinancialModal ───────────────────────────────────────────────────────

function AddFinancialModal({
  open, onClose, onSaved, editing, projects,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: VerumFinancial | null
  projects: VerumProject[]
}) {
  useLang()
  const [type, setType] = useState<VerumFinancial['type']>('revenue')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setType(editing.type); setAmount(String(editing.amount))
      setDescription(editing.description); setDate(editing.date)
      setProjectId(editing.project_id ?? ''); setCategory(editing.category ?? '')
      setNotes(editing.notes ?? '')
    } else {
      setType('revenue'); setAmount(''); setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setProjectId(''); setCategory(''); setNotes('')
    }
    setError('')
  }, [editing, open])

  async function handleSave() {
    if (!description.trim() || !amount) return
    setSaving(true); setError('')
    try {
      const method = editing ? 'PATCH' : 'POST'
      const url = editing ? `/api/verum/financials/${editing.id}` : '/api/verum/financials'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, amount: Number(amount), description, date,
          project_id: projectId || null, category: category || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error()
      onSaved(); onClose()
    } catch {
      setError(L('Erro ao guardar', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
    borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
    color: 'var(--ink-faint)', marginBottom: 5, display: 'block',
  }

  const TYPES: { value: VerumFinancial['type']; label_pt: string; label_en: string }[] = [
    { value: 'revenue', label_pt: 'Receita',  label_en: 'Revenue' },
    { value: 'expense', label_pt: 'Despesa',  label_en: 'Expense' },
    { value: 'invoice', label_pt: 'Fatura',   label_en: 'Invoice' },
    { value: 'payroll', label_pt: 'Salários', label_en: 'Payroll' },
  ]

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {editing ? L('Editar Registo', 'Edit Entry') : L('Novo Registo', 'New Entry')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type radio */}
          <div>
            <label style={labelStyle}>{L('TIPO', 'TYPE')}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPES.map(t => {
                const isActive = type === t.value
                const color = TYPE_COLORS[t.value] ?? 'var(--ink-dim)'
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    style={{
                      padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: `1px solid ${isActive ? color : 'var(--edge)'}`,
                      background: isActive ? `color-mix(in oklch, ${color} 14%, transparent)` : 'transparent',
                      color: isActive ? color : 'var(--ink-dim)',
                    }}
                  >
                    {L(t.label_pt, t.label_en)}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('VALOR (€)', 'AMOUNT (€)')} *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} min={0} step={0.01} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>{L('DATA', 'DATE')}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{L('DESCRIÇÃO', 'DESCRIPTION')} *</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('PROJETO', 'PROJECT')}</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
                <option value="">{L('— Nenhum —', '— None —')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{L('CATEGORIA', 'CATEGORY')}</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{L('NOTAS', 'NOTES')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {error && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--neg)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>{L('Cancelar', 'Cancel')}</button>
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-verum)' } as React.CSSProperties}
            onClick={handleSave}
            disabled={saving || !description.trim() || !amount}
          >
            {saving ? L('A guardar…', 'Saving…') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── FinancialsView ──────────────────────────────────────────────────────────

export default function FinancialsView() {
  useLang()
  const isMobile = useIsMobile()
  const [data, setData] = useState<FinancialsData | null>(null)
  const [projects, setProjects] = useState<VerumProject[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('90d')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VerumFinancial | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const [finRes, projRes] = await Promise.all([
        fetch(`/api/verum/financials?${params}`),
        fetch('/api/verum/projects'),
      ])
      if (finRes.ok) setData(await finRes.json())
      if (projRes.ok) setProjects((await projRes.json()).projects ?? [])
    } finally {
      setLoading(false)
    }
  }, [period, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string) {
    if (!confirm(L('Apagar registo?', 'Delete entry?'))) return
    setData(prev => prev ? { ...prev, entries: prev.entries.filter(e => e.id !== id) } : prev)
    await fetch(`/api/verum/financials/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const entries = data?.entries ?? []
  const summary = data?.summary
  const byMonth = summary?.byMonth ?? []

  // Expense by category (from all expense/payroll entries)
  const categoryMap: Record<string, number> = {}
  for (const e of entries.filter(e => e.type === 'expense' || e.type === 'payroll')) {
    const cat = e.category ?? L('Outros', 'Other')
    categoryMap[cat] = (categoryMap[cat] ?? 0) + e.amount
  }
  const categoryData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  const totalPayroll = entries.filter(e => e.type === 'payroll').reduce((s, e) => s + e.amount, 0)

  const chartData = byMonth.map(m => ({
    month: m.month.slice(5),
    [L('Receita', 'Revenue')]: m.revenue,
    [L('Despesas', 'Expenses')]: m.expenses,
  }))
  const revenueKey = L('Receita', 'Revenue')
  const expensesKey = L('Despesas', 'Expenses')

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            {L('Financeiro', 'Financials')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 3 }}>
            {entries.length} {L('registo(s)', 'entry(s)')}
          </div>
        </div>
        <button
          className="btn btn-accent"
          style={{ '--accent': 'var(--c-verum)' } as React.CSSProperties}
          onClick={() => { setEditingEntry(null); setShowModal(true) }}
        >
          <Icon name="plus" size={13} />
          {L('Novo Registo', 'New Entry')}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
          {/* Left column — entries */}
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {PERIOD_OPTIONS.map(p => {
                const isActive = period === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: `1px solid ${isActive ? 'var(--c-verum)' : 'var(--edge)'}`,
                      background: isActive ? 'color-mix(in oklch, var(--c-verum) 14%, transparent)' : 'transparent',
                      color: isActive ? 'var(--c-verum)' : 'var(--ink-dim)',
                    }}
                  >
                    {L(p.label_pt, p.label_en)}
                  </button>
                )
              })}
            </div>

            {/* Type filter */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
              {TYPE_FILTERS.map(f => {
                const isActive = typeFilter === f.value
                const color = TYPE_COLORS[f.value] ?? 'var(--ink-dim)'
                return (
                  <button
                    key={f.value}
                    onClick={() => setTypeFilter(f.value)}
                    style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      border: `1px solid ${isActive ? (f.value === 'all' ? 'var(--c-verum)' : color) : 'var(--edge-soft)'}`,
                      background: isActive
                        ? `color-mix(in oklch, ${f.value === 'all' ? 'var(--c-verum)' : color} 14%, transparent)`
                        : 'transparent',
                      color: isActive ? (f.value === 'all' ? 'var(--c-verum)' : color) : 'var(--ink-faint)',
                    }}
                  >
                    {L(f.label_pt, f.label_en)}
                  </button>
                )
              })}
            </div>

            {/* Summary strip */}
            {summary && (
              <div style={{
                display: 'flex', gap: 14, padding: '10px 14px', marginBottom: 14,
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 2 }}>{L('RECEITA', 'REVENUE')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--pos)' }}>{fmt.eurk(summary.totalRevenue)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 2 }}>{L('DESPESAS', 'EXPENSES')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--neg)' }}>{fmt.eurk(summary.totalExpenses)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 2 }}>{L('LUCRO', 'PROFIT')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: summary.netProfit >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {fmt.eurk(summary.netProfit)}
                  </div>
                </div>
              </div>
            )}

            {/* Entries list */}
            {entries.length === 0 ? (
              <EmptyState icon="coins" title={L('Sem registos', 'No entries')} subtitle={L('Adiciona o primeiro registo financeiro.', 'Add your first financial entry.')} />
            ) : (
              <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {entries.map((entry, i) => {
                  const isIncome = entry.type === 'revenue' || entry.type === 'invoice'
                  const color = TYPE_COLORS[entry.type] ?? 'var(--ink-dim)'
                  return (
                    <div key={entry.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderBottom: i < entries.length - 1 ? '1px solid var(--edge-soft)' : 'none',
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, flexShrink: 0,
                        background: `color-mix(in oklch, ${color} 14%, transparent)`, color,
                      }}>
                        {entry.type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.description}
                        </div>
                        {entry.category && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{entry.category}</div>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isIncome ? 'var(--pos)' : 'var(--neg)', flexShrink: 0 }}>
                        {isIncome ? '+' : '−'}{fmt.eur(entry.amount)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
                        {formatDate(entry.date)}
                      </span>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button
                          onClick={() => { setEditingEntry(entry); setShowModal(true) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}
                        >
                          <Icon name="edit" size={11} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 4 }}
                        >
                          <Icon name="trash" size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column — charts */}
          <div style={{ flex: '0 1 320px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Revenue vs expenses area chart */}
            {chartData.length > 0 && (
              <div style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  {L('Receita vs Despesas', 'Revenue vs Expenses')}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-raised-2)', border: '1px solid var(--edge)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'var(--ink-faint)' }}
                    />
                    <Area type="monotone" dataKey={revenueKey} stroke="var(--pos)" fill="color-mix(in oklch, var(--pos) 20%, transparent)" strokeWidth={2} />
                    <Area type="monotone" dataKey={expensesKey} stroke="var(--neg)" fill="color-mix(in oklch, var(--neg) 15%, transparent)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Expense by category */}
            {categoryData.length > 0 && (
              <div style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  {L('Despesas por Categoria', 'Expenses by Category')}
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} width={72} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-raised-2)', border: '1px solid var(--edge)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => typeof v === 'number' ? fmt.eur(v) : String(v)}
                    />
                    <Bar dataKey="value" fill="var(--neg)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payroll summary */}
            {totalPayroll > 0 && (
              <div style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 6 }}>
                  {L('TOTAL SALÁRIOS', 'TOTAL PAYROLL')}
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--neg)' }}>
                  {fmt.eur(totalPayroll)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                  {L('no período selecionado', 'in selected period')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AddFinancialModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingEntry(null) }}
        onSaved={fetchData}
        editing={editingEntry}
        projects={projects}
      />
    </div>
  )
}

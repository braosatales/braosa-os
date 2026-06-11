'use client'
import { useState, useEffect, useCallback } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { Icon, EmptyState } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { fmt } from '@/lib/fmt'
import { KPI_META } from '@/lib/braosa'
import { useBraosa } from '../BraosaShell'
import AddKPIModal from '../modals/AddKPIModal'

type LatestMap = Record<string, { value: number; date: string; change?: number; label?: string }>
type HistoryMap = Record<string, { date: string; value: number }[]>

function formatKpiValue(metric: string, value: number): string {
  const meta = KPI_META[metric]
  if (!meta) return String(value)
  if (meta.format === 'currency') return fmt.eurk(value)
  if (meta.format === 'number') return fmt.num(value)
  return String(value)
}

function KpiCard({ metric, latest, onUpdate }: {
  metric: string
  latest: LatestMap[string]
  onUpdate: () => void
}) {
  useLang()
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)

  const meta = KPI_META[metric]
  if (!meta) return null

  const { value, change, label } = latest
  const isText = meta.format === 'text'

  async function handleUpdate() {
    if (!editVal) return
    setSaving(true)
    await fetch('/api/braosa/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, value: Number(editVal), date: new Date().toISOString().split('T')[0] }),
    })
    setSaving(false)
    setEditing(false)
    setEditVal('')
    onUpdate()
  }

  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--edge)',
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: 'var(--c-braosa)',
        borderRadius: 'var(--radius) var(--radius) 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: meta.color, flexShrink: 0,
        }}>
          <Icon name={meta.glyph as Parameters<typeof Icon>[0]['name']} size={14} />
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-faint)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          {L(meta.label_pt, meta.label_en)}{label ? ` — ${label}` : ''}
        </span>
      </div>

      {isText ? (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
          {String(value)}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
          {formatKpiValue(metric, value)}
        </div>
      )}

      {change !== undefined && (
        <div style={{
          marginTop: 6,
          fontSize: 12,
          color: change >= 0 ? 'var(--pos)' : 'var(--neg)',
          fontWeight: 500,
        }}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          <span style={{ color: 'var(--ink-faint)', fontWeight: 400, marginLeft: 4 }}>
            {L('vs 7 dias', 'vs 7 days')}
          </span>
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            type="number"
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            autoFocus
            style={{
              flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 6, padding: '5px 8px', color: 'var(--ink)', fontSize: 13,
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditing(false) }}
          />
          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={handleUpdate} disabled={saving}>
            {saving ? '…' : '✓'}
          </button>
          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setEditing(false)}>✕</button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--c-braosa)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
          }}
        >
          {L('Atualizar', 'Update')}
        </button>
      )}
    </div>
  )
}

function MiniChart({ data, color, title }: { data: { date: string; value: number }[]; color: string; title: string }) {
  useLang()
  if (!data || data.length < 2) return null

  const chartData = data.map(d => ({
    date: d.date.slice(5),
    value: d.value,
  }))

  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--ink-soft)' }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-raised-2)', border: '1px solid var(--edge)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--ink-faint)' }}
            itemStyle={{ color }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardView() {
  useLang()
  const isMobile = useIsMobile()
  const { navigateTo } = useBraosa()
  const [latest, setLatest] = useState<LatestMap>({})
  const [history, setHistory] = useState<HistoryMap>({})
  const [loading, setLoading] = useState(true)
  const [addKpiOpen, setAddKpiOpen] = useState(false)

  const fetchKpis = useCallback(async () => {
    try {
      const res = await fetch('/api/braosa/kpis?period=30d')
      if (res.ok) {
        const data = await res.json()
        setLatest(data.latest ?? {})
        setHistory(data.history ?? {})
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  const hasData = Object.keys(latest).length > 0

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
            BraosaTales
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 2 }}>
            {L('Visão geral do produto', 'Product overview')}
          </div>
        </div>
        <button
          className="btn btn-accent"
          style={{ '--accent': 'var(--c-braosa)' } as React.CSSProperties}
          onClick={() => setAddKpiOpen(true)}
        >
          <Icon name="plus" size={14} />
          {L('Atualizar KPIs', 'Update KPIs')}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
      ) : !hasData ? (
        <EmptyState
          icon="chart-line"
          title={L('Nenhum KPI ainda', 'No KPIs yet')}
          subtitle={L(
            'Regista métricas manualmente ou liga a BraosaTales para dados automáticos.',
            'Log metrics manually or connect BraosaTales for automatic data.'
          )}
          action={{ label: L('Adicionar Primeiros KPIs', 'Add First KPIs'), onClick: () => setAddKpiOpen(true) }}
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: isMobile ? 10 : 14,
            marginBottom: 24,
          }}>
            {Object.entries(latest).map(([metric, info]) => (
              <KpiCard key={metric} metric={metric} latest={info} onUpdate={fetchKpis} />
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {history.names_generated_total && history.names_generated_total.length >= 2 && (
              <MiniChart
                data={history.names_generated_total}
                color="var(--c-task)"
                title={L('Nomes Gerados — Últimos 30 dias', 'Names Generated — Last 30 days')}
              />
            )}
            {history.revenue_mrr && history.revenue_mrr.length >= 2 && (
              <MiniChart
                data={history.revenue_mrr}
                color="var(--c-fin)"
                title={L('MRR — Últimos 30 dias', 'MRR — Last 30 days')}
              />
            )}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setAddKpiOpen(true)}>
          <Icon name="plus" size={13} />
          {L('+ Atualizar KPIs', '+ Update KPIs')}
        </button>
        <button className="btn" onClick={() => navigateTo('products')}>
          <Icon name="wand" size={13} />
          {L('Ver Produtos', 'View Products')}
        </button>
        <button className="btn" onClick={() => navigateTo('content')}>
          <Icon name="edit" size={13} />
          {L('Planear Conteúdo', 'Plan Content')}
        </button>
      </div>

      <AddKPIModal open={addKpiOpen} onClose={() => setAddKpiOpen(false)} onSaved={fetchKpis} />
    </div>
  )
}

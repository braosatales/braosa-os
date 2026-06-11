'use client'
import { useState, useEffect, useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { Icon, EmptyState } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { fmt } from '@/lib/fmt'
import { formatDate } from '@/lib/date'
import type { VerumMilestone, VerumFinancial } from '@/lib/verum'
import { useVerum } from '../VerumShell'

type DashboardData = {
  activeProjects: number
  totalProjectValue: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  pendingMilestones: (VerumMilestone & { project?: { name: string } })[]
  teamCount: number
  recentFinancials: VerumFinancial[]
  projectsByStatus: { status: string; count: number }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
}

function KpiCard({ value, label, sub, color }: { value: string; label: string; sub: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--edge)',
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, borderRadius: 'var(--radius) var(--radius) 0 0',
      }} />
      <div style={{ marginTop: 4 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}

export default function DashboardView() {
  useLang()
  const isMobile = useIsMobile()
  const { navigateTo } = useVerum()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/verum/dashboard')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  async function completeMilestone(milestoneId: string, projectId: string) {
    setCompleting(milestoneId)
    await fetch(`/api/verum/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    setCompleting(null)
    fetchDashboard()
  }

  const chartData = (data?.monthlyRevenue ?? []).map(m => ({
    month: m.month.slice(5),
    [L('Receita', 'Revenue')]: m.revenue,
    [L('Despesas', 'Expenses')]: m.expenses,
  }))

  const revenueKey = L('Receita', 'Revenue')
  const expensesKey = L('Despesas', 'Expenses')

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
            VerumForma
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 2 }}>
            {L('Visão geral do negócio', 'Business overview')}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
      ) : !data ? (
        <EmptyState icon="chart-bar" title={L('Sem dados', 'No data')} subtitle={L('Começa por criar um projeto.', 'Start by creating a project.')} />
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 14, marginBottom: 24 }}>
            <KpiCard
              value={String(data.activeProjects)}
              label={L('Projetos Ativos', 'Active Projects')}
              sub={L('projetos ativos', 'active projects')}
              color="var(--c-verum)"
            />
            <KpiCard
              value={fmt.eurk(data.totalProjectValue)}
              label={L('Pipeline', 'Pipeline')}
              sub={L('em projetos ativos', 'in active projects')}
              color="var(--c-fin)"
            />
            <KpiCard
              value={fmt.eurk(data.totalRevenue)}
              label={L('Receita YTD', 'Revenue YTD')}
              sub={L('receita este ano', 'revenue this year')}
              color="var(--pos)"
            />
            <KpiCard
              value={fmt.eurk(data.netProfit)}
              label={L('Lucro YTD', 'Profit YTD')}
              sub={L('lucro este ano', 'profit this year')}
              color={data.netProfit >= 0 ? 'var(--pos)' : 'var(--neg)'}
            />
          </div>

          {/* Revenue chart */}
          {chartData.length > 0 && (
            <div style={{
              background: 'var(--bg-raised)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 24,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--ink-soft)' }}>
                {L('Receita vs Despesas — Últimos 6 meses', 'Revenue vs Expenses — Last 6 months')}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-faint)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-raised-2)', border: '1px solid var(--edge)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--ink-faint)' }}
                  />
                  <Bar dataKey={revenueKey} fill="var(--pos)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={expensesKey} fill="var(--neg)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pending milestones */}
          {data.pendingMilestones.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--ink-soft)' }}>
                {L('Marcos Pendentes', 'Pending Milestones')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.pendingMilestones.map(m => {
                  const isOverdue = m.due_date ? new Date(m.due_date) < new Date() : false
                  const isThisWeek = m.due_date ? (new Date(m.due_date).getTime() - Date.now()) < 7 * 86400000 : false
                  const dateColor = isOverdue ? 'var(--neg)' : isThisWeek ? 'var(--c-fin)' : 'var(--ink-faint)'
                  return (
                    <div key={m.id} style={{
                      background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    }}>
                      {m.project && (
                        <span style={{
                          background: 'color-mix(in oklch, var(--c-verum) 14%, transparent)',
                          color: 'var(--c-verum)', fontSize: 11, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                        }}>
                          {m.project.name}
                        </span>
                      )}
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)', minWidth: 100 }}>{m.title}</span>
                      {m.due_date && (
                        <span style={{ fontSize: 11, color: dateColor, flexShrink: 0 }}>
                          {formatDate(m.due_date)}
                        </span>
                      )}
                      <button
                        className="btn"
                        style={{ padding: '4px 10px', fontSize: 11, flexShrink: 0 }}
                        disabled={completing === m.id}
                        onClick={() => completeMilestone(m.id, m.project_id)}
                      >
                        {completing === m.id ? '…' : L('Marcar Concluído', 'Mark Complete')}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent financials */}
          {data.recentFinancials.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--ink-soft)' }}>
                {L('Registos Recentes', 'Recent Entries')}
              </div>
              <div style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', overflow: 'hidden',
              }}>
                {data.recentFinancials.map((f, i) => {
                  const isIncome = f.type === 'revenue' || f.type === 'invoice'
                  const typeColors: Record<string, string> = {
                    revenue: 'var(--pos)', invoice: 'var(--c-fin)',
                    expense: 'var(--neg)', payroll: 'var(--neg)',
                  }
                  return (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < data.recentFinancials.length - 1 ? '1px solid var(--edge-soft)' : 'none',
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: typeColors[f.type] ?? 'var(--ink-dim)',
                        background: `color-mix(in oklch, ${typeColors[f.type] ?? 'var(--ink-dim)'} 14%, transparent)`,
                        padding: '2px 7px', borderRadius: 99, flexShrink: 0,
                      }}>
                        {f.type}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.description}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isIncome ? 'var(--pos)' : 'var(--neg)', flexShrink: 0 }}>
                        {isIncome ? '+' : '-'}{fmt.eur(f.amount)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
                        {formatDate(f.date)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-accent" style={{ '--accent': 'var(--c-verum)' } as React.CSSProperties} onClick={() => navigateTo('projects')}>
              <Icon name="plus" size={13} />
              {L('+ Novo Projeto', '+ New Project')}
            </button>
            <button className="btn" onClick={() => navigateTo('financials')}>
              <Icon name="coins" size={13} />
              {L('+ Registo Financeiro', '+ Financial Entry')}
            </button>
            <button className="btn" onClick={() => navigateTo('team')}>
              <Icon name="users" size={13} />
              {L('Ver Equipa', 'View Team')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

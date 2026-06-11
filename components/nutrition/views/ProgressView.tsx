'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon, Modal } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { calculateWeightLossPace, type NutritionProfile } from '@/lib/nutrition'
import { formatDate } from '@/lib/date'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

type WeightLog = { date: string; weight_kg: number; notes: string | null; id: string }
type Summary = {
  avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number
  adherenceRate: number; weightTrend: { date: string; weight: number }[]
  caloriesTrend: { date: string; calories: number; target: number }[]
  currentWeight: number | null; weightChange: number | null
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function LogWeightModal({ onClose, onLogged }: { onClose: () => void; onLogged: () => void }) {
  const [weight, setWeight] = useState('')
  const [date,   setDate]   = useState(new Date().toISOString().split('T')[0])
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleLog = async () => {
    if (!weight) return
    setSaving(true)
    await fetch('/api/nutrition/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: parseFloat(weight), date, notes: notes || null }),
    })
    setSaving(false)
    onLogged()
  }

  return (
    <Modal open onClose={onClose} width={380}>
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {L('Registar Peso', 'Log Weight')}
        </div>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>{L('Peso (kg)', 'Weight (kg)')}</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          placeholder="85.0"
          style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '10px 12px', color: 'var(--ink)', fontSize: 15, marginBottom: 16 }}
        />
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>{L('Data', 'Date')}</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13, marginBottom: 16 }}
        />
        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>{L('Notas (opcional)', 'Notes (optional)')}</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13, marginBottom: 20 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>{L('Cancelar', 'Cancel')}</button>
          <button
            className="btn btn-accent"
            onClick={handleLog}
            disabled={saving || !weight}
            style={{ flex: 1, '--accent': 'var(--c-nutrition)' } as React.CSSProperties}
          >
            {saving ? L('A guardar...', 'Saving...') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const CHART_TOOLTIP_STYLE = {
  background: 'var(--bg-raised-2)',
  border: '1px solid var(--edge)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ink)',
}

export default function ProgressView() {
  useLang()
  const isMobile = useIsMobile()
  const [profile, setProfile]     = useState<NutritionProfile | null>(null)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [summary, setSummary]     = useState<Summary | null>(null)
  const [period, setPeriod]       = useState<'7d' | '30d'>('7d')
  const [showLogWeight, setShowLogWeight] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [weekly7d, setWeekly7d]   = useState<Summary | null>(null)
  const [tip, setTip]             = useState<string | null>(null)
  const [tipLoading, setTipLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [profileRes, weightRes, summaryRes] = await Promise.all([
      fetch('/api/nutrition/profile'),
      fetch('/api/nutrition/weight?period=90d'),
      fetch(`/api/nutrition/summary?period=${period}`),
    ])
    if (profileRes.ok) { const d = await profileRes.json(); setProfile(d.profile) }
    if (weightRes.ok)  { const d = await weightRes.json();  setWeightLogs(d.logs ?? []) }
    if (summaryRes.ok) {
      const d = await summaryRes.json()
      setSummary(d)
      if (period === '7d') setWeekly7d(d)
    }
    if (period !== '7d') {
      const r = await fetch('/api/nutrition/summary?period=7d')
      if (r.ok) { const d = await r.json(); setWeekly7d(d) }
    }
    setLoading(false)
  }, [period])

  useEffect(() => {
    fetch('/api/nutrition/tip')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTip(d?.tip ?? null); setTipLoading(false) })
      .catch(() => setTipLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const currentWeight = summary?.currentWeight ?? profile?.current_weight_kg ?? null
  const pace = profile ? calculateWeightLossPace(profile) : null

  const weightGoalProgress = profile && currentWeight !== null
    ? Math.min(1, Math.max(0, Math.abs(profile.current_weight_kg - currentWeight) / Math.abs(profile.current_weight_kg - profile.target_weight_kg) || 0))
    : 0

  return (
    <div style={{ padding: isMobile ? '16px 16px 80px' : 24, maxWidth: 680, margin: '0 auto' }}>

      {/* ── Weight section ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Peso', 'Weight')}
          </div>
          <button
            className="btn btn-accent"
            onClick={() => setShowLogWeight(true)}
            style={{ fontSize: 12, padding: '6px 12px', '--accent': 'var(--c-nutrition)' } as React.CSSProperties}
          >
            <Icon name="plus" size={13} />
            {L('Registar Peso', 'Log Weight')}
          </button>
        </div>

        {/* Current weight card */}
        {currentWeight !== null && (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
              <div>
                <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                  {currentWeight}kg
                </div>
                {summary?.weightChange !== null && summary?.weightChange !== undefined && (
                  <div style={{ fontSize: 12, color: (summary.weightChange ?? 0) <= 0 ? 'var(--pos)' : 'var(--neg)', marginTop: 4 }}>
                    {(summary.weightChange ?? 0) <= 0 ? '↓' : '↑'} {Math.abs(summary.weightChange ?? 0).toFixed(1)}kg {L('vs início do período', 'vs period start')}
                  </div>
                )}
              </div>
              {profile && (
                <div style={{ flex: 1, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6 }}>
                    {currentWeight}kg → {profile.target_weight_kg}kg {L('até', 'by')} {formatDate(profile.target_date)}
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${weightGoalProgress * 100}%`,
                      borderRadius: 99,
                      background: pace?.onTrack ? 'var(--pos)' : 'var(--c-fin)',
                      transition: 'width .4s',
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Pace card */}
            {pace && (
              <div style={{ background: 'var(--bg-inset)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, color: pace.onTrack ? 'var(--pos)' : 'var(--c-fin)', fontWeight: 500 }}>
                  <Icon name="trending-up" size={13} />
                  {' '}
                  {L(`A perder ~${pace.weeklyLossKg}kg/semana`, `Losing ~${pace.weeklyLossKg}kg/week`)}
                </div>
                {pace.weeksToGoal > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                    {L(
                      `Previsto chegar a ${profile?.target_weight_kg}kg em ${pace.weeksToGoal} semanas`,
                      `On track to reach ${profile?.target_weight_kg}kg in ${pace.weeksToGoal} weeks`,
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Weight chart */}
        {weightLogs.length > 1 ? (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: '16px 16px 8px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightLogs.map(w => ({ date: w.date.slice(5), weight: w.weight_kg }))}>
                <XAxis dataKey="date" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={35} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                {profile && (
                  <ReferenceLine y={profile.target_weight_kg} stroke="var(--ink-faint)" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="weight" stroke="var(--c-nutrition)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : weightLogs.length === 0 ? (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
              {L('Regista o teu peso para ver o progresso', 'Log your weight to see progress')}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Nutrition trends ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Tendências', 'Trends')}
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {(['7d', '30d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="btn"
                style={{ padding: '4px 10px', fontSize: 12, background: period === p ? 'var(--c-nutrition-dim)' : undefined, color: period === p ? 'var(--c-nutrition)' : undefined, borderColor: period === p ? 'var(--c-nutrition)' : undefined }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: 40 }}>{L('A carregar...', 'Loading...')}</div>
        ) : summary ? (
          <>
            {/* Calories chart */}
            {summary.caloriesTrend.length > 1 && (
              <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: '16px 16px 8px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-dim)', fontWeight: 500, marginBottom: 10 }}>
                  {L('Calorias', 'Calories')}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={summary.caloriesTrend.map(c => ({ ...c, date: c.date.slice(5) }))}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <ReferenceLine y={summary.caloriesTrend[0]?.target ?? 2150} stroke="var(--ink-faint)" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="calories" stroke="var(--c-nutrition)" fill="oklch(0.72 0.14 145 / 0.20)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Macro adherence */}
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)', fontWeight: 500, marginBottom: 14 }}>
                {L('Médias do período', 'Period averages')}
              </div>
              {[
                { label: L('Calorias', 'Calories'), avg: summary.avgCalories, target: profile?.target_calories ?? 2150, unit: 'kcal', color: 'var(--c-nutrition)' },
                { label: L('Proteína', 'Protein'),  avg: summary.avgProtein,  target: profile?.target_protein_g ?? 170,  unit: 'g',    color: 'var(--c-health)' },
                { label: L('Hidratos', 'Carbs'),    avg: summary.avgCarbs,    target: profile?.target_carbs_g ?? 215,    unit: 'g',    color: 'var(--c-fin)' },
                { label: L('Gordura', 'Fat'),        avg: summary.avgFat,      target: profile?.target_fat_g ?? 65,       unit: 'g',    color: 'var(--c-task)' },
              ].map(m => {
                const pct = Math.round((m.avg / m.target) * 100)
                return (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 70, fontSize: 12, color: 'var(--ink-dim)' }}>{m.label}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 99, background: m.color }} />
                    </div>
                    <div className="tnum" style={{ fontSize: 11, color: 'var(--ink-dim)', width: 80, textAlign: 'right' }}>
                      {m.avg}{m.unit} / {m.target}{m.unit}
                    </div>
                    <div style={{ fontSize: 11, color: pct >= 90 && pct <= 110 ? 'var(--pos)' : 'var(--neg)', width: 32, textAlign: 'right' }}>
                      {pct}%
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Adherence + streak */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
                <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: summary.adherenceRate >= 70 ? 'var(--pos)' : 'var(--c-fin)' }}>
                  {summary.adherenceRate}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                  {L('Dias dentro dos objetivos', 'Days on target')}
                </div>
              </div>
              <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--c-health)' }}><Icon name="flame" size={22} /></span>
                  <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>
                    {summary.caloriesTrend.length}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                  {L('dias registados', 'days logged')}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ── Weekly summary ── */}
      {weekly7d && (() => {
        const days7 = getLast7Days()
        const trendMap = new Map(weekly7d.caloriesTrend.map(e => [e.date, e]))
        const targetCal = profile?.target_calories ?? 2150
        const onTargetDays = days7.filter(d => {
          const e = trendMap.get(d)
          if (!e || e.calories === 0) return false
          const ratio = e.calories / targetCal
          return ratio >= 0.9 && ratio <= 1.1
        }).length
        return (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              {L('Esta Semana', 'This Week')}
            </div>
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 12 }}>
              {/* 7-day dot row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {days7.map(d => {
                  const e = trendMap.get(d)
                  let dotColor = 'var(--ink-faint)'
                  if (e && e.calories > 0) {
                    const ratio = e.calories / targetCal
                    dotColor = ratio >= 0.9 && ratio <= 1.1 ? 'var(--pos)' : ratio <= 1.2 ? 'var(--c-fin)' : 'var(--neg)'
                  }
                  const label = new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'narrow' })
                  return (
                    <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{label}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
                <span style={{ color: onTargetDays >= 5 ? 'var(--pos)' : 'var(--c-fin)', fontWeight: 600 }}>{onTargetDays}</span>
                {L('/7 dias dentro do objetivo', '/7 days on target')}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                  {L('Média:', 'Avg:')} <span className="tnum" style={{ color: 'var(--ink-dim)', fontWeight: 500 }}>{weekly7d.avgCalories} kcal</span>
                  {' '}/ {targetCal} kcal
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                  {L('Prot:', 'Prot:')} <span className="tnum" style={{ color: 'var(--c-health)', fontWeight: 500 }}>{weekly7d.avgProtein}g</span>
                  {' '}/ {profile?.target_protein_g ?? 170}g
                </div>
              </div>
            </div>

            {/* AI tip */}
            {tipLoading ? (
              <div style={{ background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon name="wand" size={13} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-nutrition)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            ) : tip ? (
              <div style={{ background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--c-nutrition)', flexShrink: 0, marginTop: 1 }}><Icon name="wand" size={13} /></span>
                <span style={{ fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic', lineHeight: 1.5 }}>{tip}</span>
              </div>
            ) : null}
          </div>
        )
      })()}

      {showLogWeight && (
        <LogWeightModal
          onClose={() => setShowLogWeight(false)}
          onLogged={() => { setShowLogWeight(false); fetchAll() }}
        />
      )}
    </div>
  )
}

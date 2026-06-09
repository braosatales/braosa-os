'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { Icon, EmptyState } from '@/components/ui'
import { useLang, L, getLang } from '@/lib/i18n'
import { MUSCLE_GROUP_META } from '@/lib/exercise'
import { SESSION_TYPE_META } from '@/lib/journey'
import SessionLogModal from '@/components/health/modals/SessionLogModal'
import { useHealth } from '@/components/health/HealthShell'
import type { IconName } from '@/lib/icons'

type Period = '30d' | '90d' | '6m' | '1y'

type SetItem = {
  id: string; session_id: string; user_id: string
  exercise_id: string; exercise_name: string; set_number: number
  reps: number | null; weight_kg: number | null
  is_pr: boolean; completed: boolean; notes: string | null; created_at: string
}

type RecentSession = {
  id: string; name: string; session_type: string
  started_at: string; ended_at: string | null
  duration_seconds: number | null; notes: string | null; feedback: string | null
  session_sets: SetItem[]
}

type ExerciseProgress = {
  exercise_id: string
  exercise_name: string
  dataPoints: { date: string; weight_kg: number; reps: number; estimated1rm: number; is_pr: boolean }[]
}

type ProgressData = {
  summary: {
    totalSessions: number; totalSets: number; totalDuration: number
    avgDuration: number; currentStreak: number; longestStreak: number; completionRate: number
  }
  sessionsPerWeek: { week: string; count: number }[]
  volumeByMuscleGroup: { muscle: string; sets: number }[]
  exerciseProgress: ExerciseProgress[]
  recentSessions: RecentSession[]
  whoopMetrics: unknown[]
}

const PERIOD_OPTIONS: { id: Period; label_pt: string; label_en: string }[] = [
  { id: '30d', label_pt: '30D', label_en: '30D' },
  { id: '90d', label_pt: '90D', label_en: '90D' },
  { id: '6m',  label_pt: '6M',  label_en: '6M'  },
  { id: '1y',  label_pt: '1A',  label_en: '1Y'  },
]

const FEEDBACK_EMOJI: Record<string, string> = {
  too_easy: '😴',
  just_right: '💪',
  too_hard: '😅',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

function formatHours(seconds: number): string {
  const h = seconds / 3600
  return h < 1 ? `${Math.round(seconds / 60)}min` : `${h.toFixed(1)}h`
}

function formatWeekLabel(weekMonday: string, lang: string): string {
  const d = new Date(weekMonday + 'T00:00:00')
  return d.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'short' })
}

function relativeTime(dateStr: string, lang: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return lang === 'pt' ? 'hoje' : 'today'
  if (diffDays === 1) return lang === 'pt' ? 'ontem' : 'yesterday'
  if (diffDays < 7) return lang === 'pt' ? `há ${diffDays} dias` : `${diffDays} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type BarTooltipProps = { active?: boolean; payload?: Array<{ value: number }>; label?: string }

function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  const count = payload[0].value
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--edge)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--ink-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--c-health)', fontWeight: 600 }}>
        {count} {count === 1 ? L('sessão', 'session') : L('sessões', 'sessions')}
      </div>
    </div>
  )
}

type LineTooltipProps = { active?: boolean; payload?: Array<{ value: number; payload: { weight_kg: number; reps: number } }>; label?: string }

function LineTooltip({ active, payload, label }: LineTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--edge)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--ink-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--ink-dim)', marginBottom: 2 }}>
        {p.payload.weight_kg}kg × {p.payload.reps} reps
      </div>
      <div style={{ color: 'var(--c-health)', fontWeight: 600 }}>
        {L('1RM estimado', 'Est. 1RM')}: {p.value}kg
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 72, borderRadius: 'var(--radius)',
          background: 'var(--bg-raised-2)',
          animation: 'skeleton-pulse 1.4s ease-in-out infinite alternate',
        }} />
      ))}
    </div>
  )
}

export default function HistoryView() {
  const lang = useLang()
  const { navigateTo } = useHealth()
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<RecentSession | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/health/progress?period=${p}`)
      const json = await res.json()
      setData(json)
      if (json.exerciseProgress?.length > 0 && !selectedExerciseId) {
        setSelectedExerciseId(json.exerciseProgress[0].exercise_id)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [selectedExerciseId])

  useEffect(() => { fetchData(period) }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    setSelectedExerciseId(null)
  }

  const summary = data?.summary
  const sessionsPerWeek = data?.sessionsPerWeek ?? []
  const volumeByMuscleGroup = (data?.volumeByMuscleGroup ?? []).slice(0, 6)
  const maxMuscleVol = Math.max(...volumeByMuscleGroup.map(m => m.sets), 1)
  const exerciseProgress = data?.exerciseProgress ?? []
  const recentSessions = data?.recentSessions ?? []

  const selectedEx = exerciseProgress.find(e => e.exercise_id === selectedExerciseId) ?? exerciseProgress[0] ?? null
  const prDataPoint = selectedEx?.dataPoints.find(p => p.is_pr) ?? null

  const chartWeekData = sessionsPerWeek.map(sw => ({
    ...sw,
    label: formatWeekLabel(sw.week, lang),
  }))

  const sectionHeader = (title: string) => (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
      color: 'var(--ink)', marginBottom: 12,
    }}>
      {title}
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
          {L('Histórico', 'History')}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIOD_OPTIONS.map(opt => {
            const isActive = period === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => handlePeriodChange(opt.id)}
                style={{
                  padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: `1px solid ${isActive ? 'var(--c-health)' : 'var(--edge)'}`,
                  background: isActive ? 'var(--c-health-dim)' : 'transparent',
                  color: isActive ? 'var(--c-health)' : 'var(--ink-dim)',
                  transition: 'all .15s',
                }}
              >
                {lang === 'pt' ? opt.label_pt : opt.label_en}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : !data || summary?.totalSessions === 0 ? (
        <EmptyState
          icon="activity"
          title={L('Sem sessões ainda', 'No sessions yet')}
          subtitle={L('Os teus treinos aparecerão aqui.', 'Your workouts will appear here.')}
          action={{ label: L('Iniciar Treino', 'Start Workout'), onClick: () => navigateTo('workout') }}
        />
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { icon: 'activity' as IconName, value: summary!.totalSessions, label: L('sessões', 'sessions') },
              { icon: 'clock' as IconName, value: formatHours(summary!.totalDuration), label: L('de treino', 'of training') },
              { icon: 'target' as IconName, value: `${Math.round(summary!.avgDuration / 60)}`, label: L('min por sessão', 'min per session') },
              { icon: 'check-circle' as IconName, value: `${summary!.completionRate}%`, label: L('do plano cumprido', 'of plan completed') },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--c-health)' }}>
                  <Icon name={stat.icon} size={14} />
                </div>
                <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Sessions per week */}
          <div style={{ marginBottom: 28 }}>
            {sectionHeader(L('Sessões por Semana', 'Sessions per Week'))}
            {chartWeekData.length === 0 ? (
              <EmptyState icon="chart-bar" title={L('Sem dados ainda', 'No data yet')} />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartWeekData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--ink-faint)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: 'var(--ink-faint)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'oklch(0.7 0.13 38 / 0.08)' }} />
                  <Bar dataKey="count" fill="var(--c-health)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Volume by muscle group */}
          {volumeByMuscleGroup.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              {sectionHeader(L('Volume por Grupo Muscular', 'Volume by Muscle Group'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {volumeByMuscleGroup.map(({ muscle, sets }) => {
                  const meta = MUSCLE_GROUP_META[muscle]
                  const label = meta ? L(meta.label_pt, meta.label_en) : muscle
                  const color = meta?.color ?? 'var(--c-health)'
                  const pct = Math.round((sets / maxMuscleVol) * 100)
                  return (
                    <div key={muscle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--ink-dim)' }}>{label}</span>
                        <span className="tnum" style={{ color: 'var(--ink-faint)' }}>{sets} {L('séries', 'sets')}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-raised-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .3s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Exercise progression */}
          {exerciseProgress.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              {sectionHeader(L('Progressão por Exercício', 'Exercise Progression'))}

              {/* Exercise selector chips */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
                {exerciseProgress.map(ex => {
                  const isActive = (selectedExerciseId ?? exerciseProgress[0]?.exercise_id) === ex.exercise_id
                  return (
                    <button
                      key={ex.exercise_id}
                      onClick={() => setSelectedExerciseId(ex.exercise_id)}
                      style={{
                        flexShrink: 0, padding: '5px 12px', borderRadius: 99,
                        fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                        border: `1px solid ${isActive ? 'var(--c-health)' : 'var(--edge)'}`,
                        background: isActive ? 'var(--c-health-dim)' : 'transparent',
                        color: isActive ? 'var(--c-health)' : 'var(--ink-dim)',
                        transition: 'all .15s',
                      }}
                    >
                      {ex.exercise_name}
                    </button>
                  )
                })}
              </div>

              {/* Line chart */}
              {selectedEx && selectedEx.dataPoints.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={selectedEx.dataPoints} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'var(--ink-faint)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(d: string) => {
                          const dt = new Date(d + 'T00:00:00')
                          return dt.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'short' })
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--ink-faint)' }}
                        axisLine={false}
                        tickLine={false}
                        unit="kg"
                      />
                      <Tooltip content={<LineTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="estimated1rm"
                        stroke="var(--c-health)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--c-health)', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {prDataPoint && (
                    <div style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: 'color-mix(in oklch, var(--c-fin) 12%, transparent)',
                      border: '1px solid color-mix(in oklch, var(--c-fin) 30%, transparent)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5, fontWeight: 600, color: 'var(--c-fin)',
                    }}>
                      🏆 {L('Recorde pessoal', 'Personal record')}: {prDataPoint.weight_kg}kg × {prDataPoint.reps} reps
                    </div>
                  )}
                </>
              ) : (
                <EmptyState icon="chart-line" title={L('Sem dados para este exercício', 'No data for this exercise')} />
              )}
            </div>
          )}

          {/* Recent sessions */}
          <div>
            {sectionHeader(L('Sessões Recentes', 'Recent Sessions'))}
            {recentSessions.length === 0 ? (
              <EmptyState icon="activity" title={L('Sem sessões recentes', 'No recent sessions')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSessions.map(s => {
                  const meta = SESSION_TYPE_META[s.session_type]
                  const sets = s.session_sets ?? []
                  const exerciseNames = [...new Set(sets.map(set => set.exercise_name))]
                  const truncated = exerciseNames.slice(0, 3).join(', ')
                  const remaining = exerciseNames.length - 3
                  const exerciseLabel = remaining > 0 ? `${truncated}, +${remaining}` : truncated

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)',
                        borderRadius: 'var(--radius)', padding: '14px 16px',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'border-color .15s, background .15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--edge)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--edge-soft)' }}
                    >
                      {/* Icon box */}
                      <div style={{
                        width: 36, height: 36, flexShrink: 0,
                        borderRadius: 8,
                        background: `color-mix(in oklch, ${meta?.color ?? 'var(--c-health)'} 16%, transparent)`,
                        border: `1px solid ${meta?.color ?? 'var(--c-health)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: meta?.color ?? 'var(--c-health)',
                      }}>
                        <Icon name={(meta?.glyph ?? 'activity') as IconName} size={16} />
                      </div>

                      {/* Center content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 2 }}>
                          {relativeTime(s.started_at, lang)}
                        </div>
                        {exerciseLabel && (
                          <div style={{
                            fontSize: 12, color: 'var(--ink-dim)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {exerciseLabel}
                          </div>
                        )}
                      </div>

                      {/* Right */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span className="tnum" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                          {formatDuration(s.duration_seconds)}
                        </span>
                        {s.feedback && (
                          <span style={{ fontSize: 15 }}>{FEEDBACK_EMOJI[s.feedback] ?? ''}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {selectedSession && (
        <SessionLogModal
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}

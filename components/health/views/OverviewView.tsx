'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon, EmptyState } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { TrainingPlan, PlannedSession, SESSION_TYPE_META } from '@/lib/journey'

type PlanWithSessions = TrainingPlan & { planned_sessions: PlannedSession[] }
type Props = { onNavigate: (tab: string) => void }

function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

const DAYS = [
  { code: 'MO', label_pt: 'Seg', label_en: 'Mon' },
  { code: 'TU', label_pt: 'Ter', label_en: 'Tue' },
  { code: 'WE', label_pt: 'Qua', label_en: 'Wed' },
  { code: 'TH', label_pt: 'Qui', label_en: 'Thu' },
  { code: 'FR', label_pt: 'Sex', label_en: 'Fri' },
  { code: 'SA', label_pt: 'Sáb', label_en: 'Sat' },
  { code: 'SU', label_pt: 'Dom', label_en: 'Sun' },
]

function calculateStreak(plans: PlanWithSessions[]): number {
  const currentWeek = getMondayOfWeek()
  let week = currentWeek
  let streak = 0
  const planMap = Object.fromEntries(plans.map(p => [p.week_start, p]))
  for (let i = 0; i < 52; i++) {
    const plan = planMap[week]
    if (!plan) break
    const hasCompleted = plan.planned_sessions.some(s => s.status === 'completed')
    if (!hasCompleted) break
    streak++
    week = addWeeks(week, -1)
  }
  return streak
}

function getNextSession(plans: PlanWithSessions[], todayStr: string): PlannedSession | null {
  const currentWeek = getMondayOfWeek()
  const relevant = plans
    .filter(p => p.week_start >= currentWeek)
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
  for (const plan of relevant) {
    const pending = plan.planned_sessions
      .filter(s => s.status === 'pending' && s.session_date >= todayStr)
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
    if (pending.length > 0) return pending[0]
  }
  return null
}

export default function OverviewView({ onNavigate }: Props) {
  const lang = useLang()
  const [plans, setPlans] = useState<PlanWithSessions[]>([])
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toISOString().split('T')[0]
  const currentWeek = getMondayOfWeek()

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/health/plans')
      const json = await res.json()
      setPlans(json.plans ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const thisWeekPlan = plans.find(p => p.week_start === currentWeek) ?? null
  const sessions = thisWeekPlan?.planned_sessions ?? []
  const trainingSessions = sessions.filter(s => s.session_type !== 'rest')
  const completedCount = sessions.filter(s => s.status === 'completed').length
  const totalCount = trainingSessions.length
  const streak = calculateStreak(plans)
  const nextSession = getNextSession(plans, todayStr)

  const sessionsByDay = Object.fromEntries(sessions.map(s => [s.day_of_week, s]))

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: 14 }}>
        {L('A carregar…', 'Loading…')}
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
        {L('Visão Geral', 'Overview')}
      </div>

      {!thisWeekPlan ? (
        <EmptyState
          icon="target"
          title={L('Sem plano esta semana', 'No plan this week')}
          subtitle={L('Gera um plano de treino para começar a semana.', 'Generate a training plan to start the week.')}
          action={{ label: L('Ir para Jornada', 'Go to Journey'), onClick: () => onNavigate('journey') }}
        />
      ) : (
        <>
          {/* This week card */}
          <div style={{
            background: 'var(--bg-raised)',
            border: '1px solid color-mix(in oklch, var(--c-health) 30%, var(--edge))',
            borderRadius: 'var(--radius)',
            padding: 20,
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--c-health)' }}>
                {L('Esta Semana', 'This Week')}
              </span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--c-health)', padding: 0 }}
                onClick={() => onNavigate('journey')}
              >
                {L('Ver Plano Completo →', 'View Full Plan →')}
              </button>
            </div>

            {/* 7-day mini strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 14 }}>
              {DAYS.map(day => {
                const session = sessionsByDay[day.code] ?? null
                const meta = session ? SESSION_TYPE_META[session.session_type] : null
                const isCompleted = session?.status === 'completed'

                return (
                  <div key={day.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                      {lang === 'pt' ? day.label_pt : day.label_en}
                    </span>
                    <div style={{
                      width: '100%',
                      minHeight: 36,
                      background: session ? 'var(--bg-raised-2)' : 'transparent',
                      border: session ? `1px solid ${meta?.color ?? 'var(--edge)'}` : '1px dashed var(--edge-soft)',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      padding: '3px 2px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {isCompleted && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'color-mix(in oklch, var(--pos) 18%, transparent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ color: 'var(--pos)', fontSize: 14 }}>✓</span>
                        </div>
                      )}
                      {session && !isCompleted && (
                        <span style={{
                          fontSize: 8.5,
                          color: meta?.color ?? 'var(--ink-faint)',
                          textAlign: 'center',
                          lineHeight: 1.2,
                          padding: '0 2px',
                          overflow: 'hidden',
                          maxHeight: 28,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {session.session_name.length > 10 ? session.session_name.slice(0, 9) + '…' : session.session_name}
                        </span>
                      )}
                      {!session && (
                        <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>·</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  {completedCount}/{totalCount} {L('sessões', 'sessions')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--c-health)', fontWeight: 600 }}>
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-raised-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  background: 'var(--c-health)',
                  borderRadius: 99,
                  transition: 'width .4s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {/* Sessions this week */}
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)',
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ color: 'var(--pos)' }}><Icon name="check-circle" size={14} /></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.12em' }}>
                  {L('ESTA SEMANA', 'THIS WEEK')}
                </span>
              </div>
              <div className="tnum" style={{ fontSize: 28, fontWeight: 700, color: 'var(--pos)', lineHeight: 1 }}>
                {completedCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                {L('sessões concluídas', 'sessions done')}
              </div>
            </div>

            {/* Streak */}
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)',
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ color: 'var(--c-fin)' }}><Icon name="flame" size={14} /></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.12em' }}>
                  {L('SEQUÊNCIA', 'STREAK')}
                </span>
              </div>
              <div className="tnum" style={{ fontSize: 28, fontWeight: 700, color: 'var(--c-fin)', lineHeight: 1 }}>
                {streak}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                {L('semanas seguidas', 'consecutive weeks')}
              </div>
            </div>

            {/* Next workout */}
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)',
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ color: 'var(--c-health)' }}><Icon name="target" size={14} /></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.12em' }}>
                  {L('PRÓXIMO', 'NEXT')}
                </span>
              </div>
              {nextSession ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 2, color: 'var(--ink)' }}>
                    {nextSession.session_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {DAYS.find(d => d.code === nextSession.day_of_week)?.[lang === 'pt' ? 'label_pt' : 'label_en'] ?? nextSession.day_of_week}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                  {L('Sem sessões pendentes', 'No pending sessions')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

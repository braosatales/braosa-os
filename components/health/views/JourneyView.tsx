'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { TrainingPlan, PlannedSession, SESSION_TYPE_META } from '@/lib/journey'
import SessionDetailModal from '../modals/SessionDetailModal'

type PlanWithSessions = TrainingPlan & { planned_sessions: PlannedSession[] }

function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function getDayDate(weekStart: string, dayCode: string): string {
  const OFFSETS: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 }
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + (OFFSETS[dayCode] ?? 0))
  return d.toISOString().split('T')[0]
}

function formatWeekDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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

export default function JourneyView() {
  const lang = useLang()
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek())
  const [plans, setPlans] = useState<PlanWithSessions[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [customRequest, setCustomRequest] = useState('')
  const [selectedSession, setSelectedSession] = useState<PlannedSession | null>(null)
  const [feedbackSaving, setFeedbackSaving] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

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

  const activePlan = plans.find(p => p.week_start === weekStart) ?? null
  const prevWeekStart = addWeeks(weekStart, -1)
  const prevPlan = plans.find(p => p.week_start === prevWeekStart) ?? null

  async function handleGenerate() {
    setGenerating(true)
    try {
      await fetch('/api/health/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart,
          feedback: prevPlan?.feedback ?? undefined,
          customRequest: customRequest.trim() || undefined,
        }),
      })
      setCustomRequest('')
      await fetchPlans()
    } finally {
      setGenerating(false)
    }
  }

  async function handleFeedback(fb: string) {
    if (!activePlan) return
    setFeedbackSaving(true)
    await fetch(`/api/health/plans/${activePlan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: fb }),
    })
    await fetchPlans()
    setFeedbackSaving(false)
  }

  function handleSessionStatusChange(sessionId: string, status: string) {
    setPlans(prev => prev.map(p => ({
      ...p,
      planned_sessions: p.planned_sessions.map(s =>
        s.id === sessionId ? { ...s, status: status as PlannedSession['status'] } : s
      ),
    })))
    if (selectedSession?.id === sessionId) {
      setSelectedSession(prev => prev ? { ...prev, status: status as PlannedSession['status'] } : prev)
    }
  }

  const sessions = activePlan?.planned_sessions ?? []
  const sessionsByDay = Object.fromEntries(sessions.map(s => [s.day_of_week, s]))
  const allDone = sessions.length > 0 && sessions.every(s => s.status === 'completed' || s.status === 'skipped')

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
            {L('A tua Jornada', 'Your Journey')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginTop: 3 }}>
            {L('Semana de', 'Week of')} {formatWeekDate(weekStart, lang)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn" style={{ padding: '7px 10px' }} onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
              <Icon name="chevron-left" size={14} />
            </button>
            <button className="btn" onClick={() => setWeekStart(getMondayOfWeek())}>
              {L('Hoje', 'Today')}
            </button>
            <button className="btn" style={{ padding: '7px 10px' }} onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
          {activePlan && (
            <button
              className="btn btn-accent"
              style={{ '--accent': 'var(--c-health)' } as React.CSSProperties}
              onClick={handleGenerate}
              disabled={generating}
            >
              <Icon name="wand" size={14} />
              {L('Gerar Plano', 'Generate Plan')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 60, fontSize: 14 }}>
          {L('A carregar...', 'Loading...')}
        </div>
      ) : !activePlan ? (
        /* No plan for this week */
        <div style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--radius)',
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{ color: 'var(--c-health)', opacity: 0.7, marginBottom: 16 }}>
            <Icon name="wand" size={40} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {L('Sem plano para esta semana', 'No plan for this week')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 24, lineHeight: 1.6 }}>
            {L(
              'O teu assistente de treino vai gerar um plano personalizado baseado no teu perfil.',
              'Your training assistant will generate a personalised plan based on your profile.'
            )}
          </div>
          {prevPlan?.feedback && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 99,
              background: 'var(--c-health-dim)',
              color: 'var(--c-health)',
              fontSize: 12,
              marginBottom: 20,
            }}>
              {L('Semana anterior:', 'Previous week:')} {prevPlan.feedback.replace('_', ' ')}
            </div>
          )}
          <div style={{ maxWidth: 400, margin: '0 auto 20px' }}>
            <input
              value={customRequest}
              onChange={e => setCustomRequest(e.target.value)}
              placeholder={L('Pedido especial (opcional)...', 'Special request (optional)...')}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-inset)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: 13,
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--c-health)'; e.target.style.boxShadow = `0 0 0 2px color-mix(in oklch, var(--c-health) 20%, transparent)` }}
              onBlur={e => { e.target.style.borderColor = 'var(--edge)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-health)', width: '100%', maxWidth: 400, justifyContent: 'center', padding: '12px 20px', fontSize: 14 } as React.CSSProperties}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </span>
                {L('A criar o teu plano personalizado...', 'Creating your personalised plan...')}
              </>
            ) : (
              <>{L('Gerar Plano com IA 🤖', 'Generate AI Plan 🤖')}</>
            )}
          </button>
        </div>
      ) : (
        /* Active plan */
        <>
          {/* AI Reasoning */}
          {activePlan.ai_reasoning && (
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--c-health)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon name="wand" size={14} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--c-health)', letterSpacing: '0.14em' }}>
                  {L('RACIOCÍNIO DA IA', 'AI REASONING')}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6, margin: 0 }}>
                {activePlan.ai_reasoning}
              </p>
            </div>
          )}

          {/* Week Calendar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            marginBottom: 28,
          }}>
            {DAYS.map(day => {
              const dayDate = getDayDate(weekStart, day.code)
              const dayNum = dayDate.split('-')[2]
              const isToday = dayDate === todayStr
              const session = sessionsByDay[day.code] ?? null
              const meta = session ? SESSION_TYPE_META[session.session_type] : null

              return (
                <div key={day.code}>
                  {/* Day header */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                      {lang === 'pt' ? day.label_pt : day.label_en}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isToday ? 'var(--c-health)' : 'var(--ink)',
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isToday ? 'var(--c-health-dim)' : 'transparent',
                    }}>
                      {dayNum}
                    </span>
                  </div>

                  {session ? (
                    <button
                      onClick={() => setSelectedSession(session)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--edge)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color .15s, box-shadow .15s',
                        minHeight: 90,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta?.color ?? 'var(--edge-strong)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--edge)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta?.color ?? 'var(--ink-faint)', flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.session_name}
                        </span>
                      </div>
                      {session.estimated_duration && (
                        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                          {session.estimated_duration}min
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                        {session.exercises.length} {L('exercícios', 'exercises')}
                      </span>
                      <div style={{ marginTop: 'auto' }}>
                        <span style={{
                          fontSize: 9,
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.08em',
                          color: session.status === 'completed' ? 'var(--pos)' : session.status === 'skipped' ? 'var(--neg)' : 'var(--ink-faint)',
                        }}>
                          {session.status === 'completed' ? L('✓ FEITO', '✓ DONE') : session.status === 'skipped' ? L('SALTADO', 'SKIPPED') : L('PENDENTE', 'PENDING')}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div style={{
                      width: '100%',
                      border: '1px dashed var(--edge-soft)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 10,
                      minHeight: 90,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        {L('Descanso', 'Rest')}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Week feedback */}
          {allDone && (
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                {L('Como correu esta semana?', 'How was this week?')}
              </div>
              {activePlan.feedback ? (
                <div style={{ fontSize: 13, color: 'var(--c-health)' }}>
                  {L('Feedback registado:', 'Feedback recorded:')} {activePlan.feedback.replace('_', ' ')}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { key: 'too_easy', label: L('😌 Fácil demais', '😌 Too Easy') },
                    { key: 'just_right', label: L('💪 Perfeito', '💪 Just Right') },
                    { key: 'too_hard', label: L('🔥 Difícil demais', '🔥 Too Hard') },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      className="btn"
                      onClick={() => handleFeedback(opt.key)}
                      disabled={feedbackSaving}
                      style={{ fontSize: 13 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Session detail modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onStatusChange={(status) => handleSessionStatusChange(selectedSession.id, status)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

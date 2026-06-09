'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon, Chip } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { TrainingPlan, PlannedSession, SESSION_TYPE_META } from '@/lib/journey'
import { WorkoutProfile, WorkoutGoal, GOAL_META } from '@/lib/health'
import SessionDetailModal from '../modals/SessionDetailModal'

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

const EXP_LABEL: Record<string, { pt: string; en: string }> = {
  beginner:     { pt: 'Iniciante',  en: 'Beginner'     },
  intermediate: { pt: 'Intermédio', en: 'Intermediate' },
  advanced:     { pt: 'Avançado',   en: 'Advanced'     },
}

const DAY_ORDER: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 }

export default function JourneyView({ onNavigate }: Props) {
  const lang = useLang()
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek())
  const [plans, setPlans] = useState<PlanWithSessions[]>([])
  const [profile, setProfile] = useState<WorkoutProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [customRequest, setCustomRequest] = useState('')
  const [selectedSession, setSelectedSession] = useState<PlannedSession | null>(null)
  const [reasoningExpanded, setReasoningExpanded] = useState(false)
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [sessionSaving, setSessionSaving] = useState<string | null>(null)

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

  useEffect(() => {
    fetchPlans()
    fetch('/api/health/profile').then(r => r.json()).then(j => setProfile(j.profile ?? null))
  }, [fetchPlans])

  const activePlan = plans.find(p => p.week_start === weekStart) ?? null
  const prevPlan = plans.find(p => p.week_start === addWeeks(weekStart, -1)) ?? null

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
      setReasoningExpanded(false)
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

  function patchSessionLocal(sessionId: string, status: PlannedSession['status']) {
    setPlans(prev => prev.map(p => ({
      ...p,
      planned_sessions: p.planned_sessions.map(s =>
        s.id === sessionId ? { ...s, status } : s
      ),
    })))
    setSelectedSession(prev => prev?.id === sessionId ? { ...prev, status } : prev)
  }

  async function handleSessionStatus(sessionId: string, status: 'completed' | 'skipped') {
    setSessionSaving(sessionId)
    const session = sessions.find(s => s.id === sessionId)
    const planId = session?.plan_id ?? activePlan?.id ?? ''
    await fetch(`/api/health/plans/${planId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    patchSessionLocal(sessionId, status)
    setSessionSaving(null)
  }

  const sessions = activePlan?.planned_sessions ?? []
  const sessionsByDay = Object.fromEntries(sessions.map(s => [s.day_of_week, s]))
  const trainingSessions = [...sessions]
    .filter(s => s.session_type !== 'rest')
    .sort((a, b) => (DAY_ORDER[a.day_of_week] ?? 0) - (DAY_ORDER[b.day_of_week] ?? 0))

  const anyDone = sessions.some(s => s.status === 'completed')
  const reasoning = activePlan?.ai_reasoning ?? ''
  const reasoningShort = reasoning.length > 100 ? reasoning.slice(0, 100) + '…' : reasoning

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
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
          {L('A carregar…', 'Loading…')}
        </div>
      ) : !activePlan ? (
        /* ── No plan ─────────────────────────────────────────────── */
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
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 20, lineHeight: 1.6 }}>
            {L(
              'O teu assistente de treino vai gerar um plano personalizado baseado no teu perfil.',
              'Your training assistant will generate a personalised plan based on your profile.'
            )}
          </div>

          {/* Profile summary chips */}
          {profile && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <Chip
                label={lang === 'pt' ? GOAL_META[profile.goal as WorkoutGoal].label_pt : GOAL_META[profile.goal as WorkoutGoal].label_en}
                color="var(--c-health)"
              />
              <Chip
                label={lang === 'pt' ? (EXP_LABEL[profile.experience_level]?.pt ?? profile.experience_level) : (EXP_LABEL[profile.experience_level]?.en ?? profile.experience_level)}
                color="var(--c-fin)"
              />
              <Chip
                label={`${profile.sessions_per_week}×/${lang === 'pt' ? 'semana' : 'week'}`}
                color="var(--c-task)"
              />
            </div>
          )}

          {prevPlan?.feedback && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 99,
              background: 'var(--c-health-dim)', color: 'var(--c-health)',
              fontSize: 12, marginBottom: 20,
            }}>
              {L('Semana anterior:', 'Previous week:')} {prevPlan.feedback.replace(/_/g, ' ')}
            </div>
          )}

          <div style={{ maxWidth: 440, margin: '0 auto 20px' }}>
            <textarea
              value={customRequest}
              onChange={e => setCustomRequest(e.target.value)}
              rows={3}
              placeholder={L('Pedido especial (opcional)… ex: "foco em pernas" ou "treino mais curto"', 'Special request (optional)… e.g. "focus on legs" or "shorter sessions"')}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-inset)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: 13,
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--c-health)'; e.target.style.boxShadow = `0 0 0 2px color-mix(in oklch, var(--c-health) 20%, transparent)` }}
              onBlur={e => { e.target.style.borderColor = 'var(--edge)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-health)', width: '100%', maxWidth: 440, justifyContent: 'center', padding: '12px 20px', fontSize: 14 } as React.CSSProperties}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', animation: `jdot 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </span>
                {L('A criar o teu plano personalizado…', 'Creating your personalised plan…')}
              </>
            ) : (
              <>{L('Gerar Plano da Semana 🤖', 'Generate Week Plan 🤖')}</>
            )}
          </button>
        </div>
      ) : (
        /* ── Active plan ─────────────────────────────────────────── */
        <>
          {/* AI Reasoning — collapsed by default */}
          {reasoning && (
            <div style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--edge-soft)',
              borderRadius: 'var(--radius)',
              padding: '14px 18px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color: 'var(--c-health)' }}><Icon name="wand" size={13} /></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--c-health)', letterSpacing: '0.14em' }}>
                  {L('RACIOCÍNIO DA IA', 'AI REASONING')}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6, margin: 0 }}>
                {reasoningExpanded ? reasoning : reasoningShort}
                {reasoning.length > 100 && (
                  <button
                    onClick={() => setReasoningExpanded(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-health)', fontSize: 12, padding: '0 0 0 6px', fontWeight: 600 }}
                  >
                    {reasoningExpanded ? L('ver menos', 'see less') : L('ver mais', 'see more')}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Week calendar strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 28 }}>
            {DAYS.map(day => {
              const dayDate = getDayDate(weekStart, day.code)
              const dayNum = dayDate.split('-')[2]
              const isToday = dayDate === todayStr
              const session = sessionsByDay[day.code] ?? null
              const meta = session ? SESSION_TYPE_META[session.session_type] : null

              return (
                <div key={day.code}>
                  <div style={{ textAlign: 'center', marginBottom: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.12em' }}>
                      {lang === 'pt' ? day.label_pt : day.label_en}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: isToday ? 'var(--c-health)' : 'var(--ink)',
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        overflow: 'hidden',
                        minHeight: 86,
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color .15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta?.color ?? 'var(--edge-strong)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--edge)' }}
                    >
                      {/* Top accent line */}
                      <div style={{ height: 3, background: meta?.color ?? 'var(--edge)', flexShrink: 0 }} />
                      <div style={{ padding: '8px 8px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {session.session_name}
                        </span>
                        {session.estimated_duration && (
                          <span style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>{session.estimated_duration}min</span>
                        )}
                        <span style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>
                          {session.exercises.length} {L('ex.', 'ex.')}
                        </span>
                        <div style={{ marginTop: 'auto' }}>
                          <span style={{
                            fontSize: 8.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.07em',
                            color: session.status === 'completed' ? 'var(--pos)' : session.status === 'skipped' ? 'var(--neg)' : 'var(--ink-faint)',
                          }}>
                            {session.status === 'completed' ? '✓' : session.status === 'skipped' ? L('SKIP', 'SKIP') : '·'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div style={{
                      border: '1px dashed var(--edge-soft)',
                      borderRadius: 'var(--radius-sm)',
                      minHeight: 86,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                        {L('Descanso', 'Rest')}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Session list cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {trainingSessions.map(session => {
              const meta = SESSION_TYPE_META[session.session_type]
              const dayLabel = DAYS.find(d => d.code === session.day_of_week)
              const isSaving = sessionSaving === session.id
              return (
                <div
                  key={session.id}
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--edge)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: 3, background: meta?.color ?? 'var(--edge)' }} />
                  <div style={{ padding: '16px 20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                            {lang === 'pt' ? dayLabel?.label_pt : dayLabel?.label_en}
                          </span>
                          <span style={{ fontSize: 10, color: meta?.color ?? 'var(--ink-faint)' }}>
                            {lang === 'pt' ? meta?.label_pt : meta?.label_en}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
                          {session.session_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {session.estimated_duration && (
                          <span style={{
                            fontSize: 11, color: 'var(--ink-faint)',
                            background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)',
                            borderRadius: 99, padding: '2px 8px',
                          }}>
                            {session.estimated_duration}min
                          </span>
                        )}
                        <span style={{
                          fontSize: 11, color: 'var(--ink-faint)',
                          background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)',
                          borderRadius: 99, padding: '2px 8px',
                        }}>
                          {session.exercises.length} {L('exercícios', 'exercises')}
                        </span>
                      </div>
                    </div>

                    {session.ai_notes && (
                      <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', fontStyle: 'italic', lineHeight: 1.55, margin: '0 0 12px' }}>
                        {session.ai_notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className="btn btn-accent"
                        style={{ '--accent': 'var(--c-health)', fontSize: 12.5 } as React.CSSProperties}
                        onClick={() => { setSelectedSession(session); }}
                      >
                        <Icon name="flame" size={13} />
                        {L('Iniciar Treino', 'Start Workout')}
                      </button>

                      {session.status === 'completed' ? (
                        <span style={{ fontSize: 12, color: 'var(--pos)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="check-circle" size={13} />
                          {L('Concluído', 'Completed')}
                        </span>
                      ) : session.status === 'skipped' ? (
                        <span style={{ fontSize: 12, color: 'var(--neg)' }}>
                          {L('Saltado', 'Skipped')}
                        </span>
                      ) : (
                        <>
                          <button
                            className="btn"
                            style={{ fontSize: 12.5, opacity: isSaving ? 0.5 : 1 }}
                            disabled={isSaving}
                            onClick={() => handleSessionStatus(session.id, 'completed')}
                          >
                            <Icon name="check-circle" size={13} />
                            {L('Concluído', 'Completed')}
                          </button>
                          <button
                            className="btn"
                            style={{ fontSize: 12, color: 'var(--ink-faint)', opacity: isSaving ? 0.5 : 1 }}
                            disabled={isSaving}
                            onClick={() => handleSessionStatus(session.id, 'skipped')}
                          >
                            {L('Saltar', 'Skip')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feedback */}
          {anyDone && (
            <div style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)',
              padding: '18px 22px',
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                {L('Como foi esta semana?', 'How was this week?')}
              </div>
              {activePlan.feedback ? (
                <div style={{ fontSize: 13, color: 'var(--c-health)' }}>
                  {L('Feedback registado:', 'Feedback recorded:')} {activePlan.feedback.replace(/_/g, ' ')}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { key: 'too_easy', label: L('😌 Fácil demais', '😌 Too Easy') },
                    { key: 'just_right', label: L('💪 Perfeito', '💪 Just Right') },
                    { key: 'too_hard', label: L('🔥 Difícil demais', '🔥 Too Hard') },
                  ].map(opt => (
                    <button key={opt.key} className="btn" style={{ fontSize: 13 }}
                      onClick={() => handleFeedback(opt.key)} disabled={feedbackSaving}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onStatusChange={(status) => patchSessionLocal(selectedSession.id, status as PlannedSession['status'])}
          onNavigate={onNavigate}
        />
      )}

      <style>{`
        @keyframes jdot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

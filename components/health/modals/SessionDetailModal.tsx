'use client'
import { useState } from 'react'
import { Modal, Icon, Chip } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { PlannedSession, PlannedExercise, SESSION_TYPE_META } from '@/lib/journey'
import { MUSCLE_GROUP_META } from '@/lib/exercise'
import { useHealth } from '@/components/health/HealthShell'

type Props = {
  session: PlannedSession
  onClose: () => void
  onStatusChange: (status: string) => void
  onNavigate?: (tab: string) => void
}

export default function SessionDetailModal({ session, onClose, onStatusChange }: Props) {
  const lang = useLang()
  const [saving, setSaving] = useState(false)
  const { startWorkout } = useHealth()

  const meta = SESSION_TYPE_META[session.session_type]

  async function handleStatus(status: 'completed' | 'skipped') {
    setSaving(true)
    await fetch(`/api/health/plans/${session.plan_id}/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onStatusChange(status)
    setSaving(false)
    onClose()
  }

  function handleStartWorkout() {
    onClose()
    startWorkout(session)
  }

  return (
    <Modal open onClose={onClose} width={580}>
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta?.color ?? 'var(--ink-faint)', flexShrink: 0 }} />
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
              {session.session_name}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: meta?.color ?? 'var(--ink-dim)' }}>
              {L(meta?.label_pt ?? session.session_type, meta?.label_en ?? session.session_type)}
            </span>
            {session.estimated_duration && (
              <span style={{
                fontSize: 11, color: 'var(--ink-faint)',
                background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)',
                borderRadius: 99, padding: '2px 8px',
              }}>
                {session.estimated_duration}min
              </span>
            )}
          </div>
          {session.ai_notes && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic', lineHeight: 1.6, margin: '10px 0 0' }}>
              {session.ai_notes}
            </p>
          )}
        </div>

        {/* Exercise list */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.14em', marginBottom: 10 }}>
            {L('EXERCÍCIOS', 'EXERCISES')}
          </div>
          {session.exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '20px 0' }}>
              {L('Sem exercícios definidos.', 'No exercises defined.')}
            </p>
          ) : (
            session.exercises.map((ex: PlannedExercise, i: number) => (
              <div
                key={ex.exercise_id + i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '11px 0',
                  borderBottom: i < session.exercises.length - 1 ? '1px solid var(--edge-soft)' : 'none',
                }}
              >
                {/* Number circle */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name */}
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
                    {ex.name}
                    {ex.name_pt && ex.name_pt !== ex.name && (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginLeft: 6, fontWeight: 400 }}>
                        {ex.name_pt}
                      </span>
                    )}
                  </div>

                  {/* Muscle group chips */}
                  {(ex.muscle_groups ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
                      {(ex.muscle_groups ?? []).map(mg => (
                        <Chip
                          key={mg}
                          label={lang === 'pt' ? (MUSCLE_GROUP_META[mg]?.label_pt ?? mg) : (MUSCLE_GROUP_META[mg]?.label_en ?? mg)}
                          color={MUSCLE_GROUP_META[mg]?.color}
                        />
                      ))}
                    </div>
                  )}

                  {/* Rest badge + video link */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10.5, color: 'var(--ink-faint)',
                      background: 'var(--bg-inset)', border: '1px solid var(--edge-soft)',
                      borderRadius: 99, padding: '1px 7px',
                    }}>
                      {L('Descanso', 'Rest')}: {ex.rest_seconds}s
                    </span>
                    {ex.notes && (
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                        {ex.notes}
                      </span>
                    )}
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent((ex.name_pt ?? ex.name) + ' exercício tutorial')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--c-health)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <Icon name="eye" size={11} />
                      {L('Ver vídeo', 'Watch video')}
                    </a>
                  </div>
                </div>

                {/* Sets × reps */}
                <div style={{ flexShrink: 0 }}>
                  <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-health)' }}>
                    {ex.sets} ×{' '}
                    {ex.reps != null ? ex.reps : ex.duration_seconds != null ? `${ex.duration_seconds}s` : '—'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Iniciar Treino — full width */}
        <div style={{ paddingBottom: 16 }}>
          <button
            className="btn btn-accent"
            style={{
              '--accent': 'var(--c-health)',
              width: '100%',
              justifyContent: 'center',
              padding: '11px 20px',
              fontSize: 14,
            } as React.CSSProperties}
            onClick={handleStartWorkout}
          >
            <Icon name="flame" size={15} />
            {L('Iniciar Treino', 'Start Workout')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px 22px',
        borderTop: '1px solid var(--edge-soft)',
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {session.status === 'completed' ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 'var(--radius-sm)',
            background: 'color-mix(in oklch, var(--pos) 14%, transparent)',
            color: 'var(--pos)', fontSize: 13, fontWeight: 600,
          }}>
            <Icon name="check-circle" size={14} />
            {L('✓ Concluído', '✓ Completed')}
          </div>
        ) : (
          <>
            <button
              onClick={() => handleStatus('completed')}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', background: 'var(--pos)',
                color: 'oklch(0.18 0.01 80)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'opacity .15s', opacity: saving ? 0.6 : 1,
              }}
            >
              <Icon name="check-circle" size={14} />
              {L('Concluído', 'Completed')}
            </button>
            <button className="btn" onClick={() => handleStatus('skipped')} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
              {L('Saltar', 'Skip')}
            </button>
          </>
        )}
        <button className="btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
          {L('Fechar', 'Close')}
        </button>
      </div>
    </Modal>
  )
}

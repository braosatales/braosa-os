'use client'
import { useState } from 'react'
import { Modal, Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { PlannedSession, PlannedExercise, SESSION_TYPE_META } from '@/lib/journey'

type Props = {
  session: PlannedSession
  onClose: () => void
  onStatusChange: (status: string) => void
}

export default function SessionDetailModal({ session, onClose, onStatusChange }: Props) {
  useLang()
  const [saving, setSaving] = useState(false)

  const meta = SESSION_TYPE_META[session.session_type]

  async function handleStatus(status: 'completed' | 'skipped') {
    setSaving(true)
    await fetch(`/api/health/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onStatusChange(status)
    setSaving(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} width={580}>
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
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
                fontSize: 11,
                color: 'var(--ink-faint)',
                background: 'var(--bg-raised-2)',
                border: '1px solid var(--edge-soft)',
                borderRadius: 99,
                padding: '2px 8px',
              }}>
                {session.estimated_duration}min
              </span>
            )}
          </div>
          {session.ai_notes && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic', lineHeight: 1.6 }}>
              {session.ai_notes}
            </p>
          )}
        </div>

        {/* Exercise list */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.14em', marginBottom: 12 }}>
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
                  padding: '10px 0',
                  borderBottom: i < session.exercises.length - 1 ? '1px solid var(--edge-soft)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
                    {ex.name}
                    {ex.name_pt && ex.name_pt !== ex.name && (
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 6, fontWeight: 400 }}>
                        {ex.name_pt}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {L('Descanso', 'Rest')}: {ex.rest_seconds}s
                  </div>
                  {ex.notes && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic', marginTop: 2 }}>
                      {ex.notes}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-health)' }}>
                    {ex.sets} ×{' '}
                    {ex.reps != null ? ex.reps : ex.duration_seconds != null ? `${ex.duration_seconds}s` : '—'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px 24px',
        borderTop: '1px solid var(--edge-soft)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {session.status === 'completed' ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'color-mix(in oklch, var(--pos) 14%, transparent)',
            color: 'var(--pos)',
            fontSize: 13,
            fontWeight: 600,
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--pos)',
                color: 'oklch(0.18 0.01 80)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity .15s',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Icon name="check-circle" size={14} />
              {L('Concluído', 'Completed')}
            </button>
            <button
              className="btn"
              onClick={() => handleStatus('skipped')}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {L('Saltar', 'Skip')}
            </button>
          </>
        )}
        <button
          className="btn"
          onClick={onClose}
          style={{ marginLeft: 'auto' }}
        >
          {L('Fechar', 'Close')}
        </button>
      </div>
    </Modal>
  )
}

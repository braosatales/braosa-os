'use client'
import { useState, useEffect } from 'react'
import { EmptyState } from '@/components/ui'
import { useLang, L, getLang } from '@/lib/i18n'
import { SESSION_TYPE_META } from '@/lib/journey'

type SessionSetMin = { id: string; exercise_id: string; completed: boolean }

type HistorySession = {
  id: string
  name: string
  session_type: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  feedback: string | null
  session_sets: SessionSetMin[]
}

const FEEDBACK_EMOJI: Record<string, string> = {
  too_easy: '😤',
  just_right: '😊',
  too_hard: '😰',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(getLang() === 'pt' ? 'pt-PT' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

export default function HistoryView() {
  useLang()
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health/sessions')
      .then(r => r.json())
      .then(({ sessions: data }) => setSessions(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
        {L('Histórico', 'History')}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 90, borderRadius: 'var(--radius)', background: 'var(--bg-raised)', animation: 'skeleton-pulse 1.4s ease-in-out infinite alternate' }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="activity"
          title={L('Sem histórico', 'No history yet')}
          subtitle={L('Os teus treinos aparecerão aqui.', 'Your workouts will appear here.')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => {
            const meta = SESSION_TYPE_META[s.session_type]
            const sets = s.session_sets ?? []
            const completedSets = sets.filter(r => r.completed).length
            const exerciseCount = new Set(sets.map(r => r.exercise_id)).size

            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius)', padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, flex: 1 }}>
                    {s.name}
                  </span>
                  {meta && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: meta.color,
                      padding: '2px 8px', background: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
                      borderRadius: 99, border: `1px solid ${meta.color}`, flexShrink: 0,
                    }}>
                      {L(meta.label_pt, meta.label_en)}
                    </span>
                  )}
                  {s.feedback && (
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {FEEDBACK_EMOJI[s.feedback] ?? ''}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-dim)', flexWrap: 'wrap' }}>
                  <span>{formatDate(s.started_at)}</span>
                  <span>·</span>
                  <span>{formatDuration(s.duration_seconds)}</span>
                  {exerciseCount > 0 && (
                    <>
                      <span>·</span>
                      <span>{exerciseCount} {L('exercício(s)', 'exercise(s)')}</span>
                    </>
                  )}
                  {completedSets > 0 && (
                    <>
                      <span>·</span>
                      <span>{completedSets} {L('série(s)', 'set(s)')}</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'
import { Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { SESSION_TYPE_META } from '@/lib/journey'

type SetItem = {
  id: string; exercise_id: string; exercise_name: string; set_number: number
  reps: number | null; weight_kg: number | null; is_pr: boolean
  completed: boolean; notes: string | null; created_at: string
}

type Session = {
  id: string; name: string; session_type: string
  started_at: string; duration_seconds: number | null
  notes: string | null; feedback: string | null
  session_sets: SetItem[]
}

type Props = {
  session: Session
  open: boolean
  onClose: () => void
}

const FEEDBACK_LABEL: Record<string, { pt: string; en: string; color: string }> = {
  too_easy:  { pt: 'Fácil de mais', en: 'Too easy',   color: 'var(--c-fin)'    },
  just_right:{ pt: 'Na medida',    en: 'Just right',  color: 'var(--pos)'      },
  too_hard:  { pt: 'Demasiado difícil', en: 'Too hard', color: 'var(--neg)'   },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

export default function SessionLogModal({ session, open, onClose }: Props) {
  useLang()

  const sets = (session.session_sets ?? []).filter(s => s.completed)
  const meta = SESSION_TYPE_META[session.session_type]

  // Group sets by exercise
  const exerciseMap: Record<string, { name: string; sets: SetItem[] }> = {}
  for (const set of sets) {
    if (!exerciseMap[set.exercise_id]) {
      exerciseMap[set.exercise_id] = { name: set.exercise_name, sets: [] }
    }
    exerciseMap[set.exercise_id].sets.push(set)
  }
  const exercises = Object.values(exerciseMap)

  const totalSets = sets.length
  const totalVolume = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)

  const feedbackInfo = session.feedback ? FEEDBACK_LABEL[session.feedback] : null

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div style={{ padding: '24px 24px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
              {session.name}
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, flexShrink: 0,
              background: 'var(--bg-raised-2)', color: 'var(--ink-dim)', border: '1px solid var(--edge)',
              fontFamily: 'var(--font-mono)',
            }}>
              {formatDuration(session.duration_seconds)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{formatDate(session.started_at)}</span>
            {meta && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                color: meta.color,
                background: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
                border: `1px solid ${meta.color}`,
              }}>
                {L(meta.label_pt, meta.label_en)}
              </span>
            )}
            {feedbackInfo && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                color: feedbackInfo.color,
                background: `color-mix(in oklch, ${feedbackInfo.color} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${feedbackInfo.color} 40%, transparent)`,
              }}>
                {L(feedbackInfo.pt, feedbackInfo.en)}
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        {session.notes && (
          <div style={{
            background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)',
            padding: '10px 12px', marginBottom: 18,
            fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5,
          }}>
            {session.notes}
          </div>
        )}

        {/* Exercise breakdown */}
        {exercises.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '20px 0' }}>
            {L('Sem séries registadas', 'No sets logged')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {exercises.map(({ name, sets: exSets }) => (
              <div key={name}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600,
                  color: 'var(--ink)', marginBottom: 8,
                }}>
                  {name}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--edge-soft)' }}>
                      {['#', L('Peso', 'Weight'), 'Reps', ''].map((h, i) => (
                        <th key={i} style={{
                          fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)',
                          padding: '4px 6px', textAlign: i === 0 ? 'center' : i === 3 ? 'right' : 'left',
                          fontWeight: 500, letterSpacing: '0.08em',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exSets.map(set => (
                      <tr key={set.id} style={{ borderBottom: '1px solid var(--edge-soft)' }}>
                        <td style={{ padding: '6px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)', width: 28 }}>
                          {set.set_number}
                        </td>
                        <td className="tnum" style={{ padding: '6px', fontSize: 13, color: 'var(--ink)' }}>
                          {set.weight_kg != null ? `${set.weight_kg}kg` : '—'}
                        </td>
                        <td className="tnum" style={{ padding: '6px', fontSize: 13, color: 'var(--ink)' }}>
                          {set.reps ?? '—'}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>
                          {set.is_pr && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                              color: 'var(--c-fin)',
                              background: 'color-mix(in oklch, var(--c-fin) 14%, transparent)',
                              border: '1px solid color-mix(in oklch, var(--c-fin) 35%, transparent)',
                            }}>
                              PR 🏆
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Footer totals */}
        {totalSets > 0 && (
          <div style={{
            marginTop: 20, paddingTop: 14,
            borderTop: '1px solid var(--edge-soft)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12, color: 'var(--ink-faint)',
          }}>
            <span className="tnum">
              {totalSets} {totalSets === 1 ? L('série', 'set') : L('séries', 'sets')}
            </span>
            <span className="tnum mono">
              {L('Volume total', 'Total volume')}: {totalVolume.toFixed(0)}kg
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

"use client"

import { useState } from 'react'
import { Modal, Icon } from '@/components/ui'
import { useLang } from '@/lib/i18n'
import type { CalendarEvent, GoogleCalendar } from '@/lib/calendar'
import { formatEventDateFull, eventDuration } from '@/lib/calendar'

type Props = {
  event: CalendarEvent
  calendars: GoogleCalendar[]
  onClose: () => void
  onEdit: (e: CalendarEvent) => void
  onDeleted: () => void
}

const RESPONSE_COLORS: Record<string, string> = {
  accepted: 'var(--pos)',
  declined: 'var(--neg)',
  tentative: 'var(--c-fin)',
  needsAction: 'var(--ink-faint)',
}

const RESPONSE_LABELS: Record<string, { pt: string; en: string }> = {
  accepted:     { pt: 'Aceite',     en: 'Accepted'   },
  declined:     { pt: 'Recusado',   en: 'Declined'   },
  tentative:    { pt: 'Talvez',     en: 'Maybe'      },
  needsAction:  { pt: 'Pendente',   en: 'Pending'    },
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

export default function EventDetailModal({ event, calendars, onClose, onEdit, onDeleted }: Props) {
  const lang = useLang()
  const [deleteMode, setDeleteMode] = useState<'ask' | null>(null)
  const [deleting, setDeleting] = useState(false)

  const calendar = calendars.find(c => c.id === event.calendarId)
  const isRecurring = !!(event.recurrence?.length || event.recurringEventId)

  const handleDelete = async (mode: 'this' | 'following' | 'all') => {
    setDeleting(true)
    try {
      await fetch(`/api/calendar/events/${event.googleEventId}?calendarId=${encodeURIComponent(event.calendarId)}&mode=${mode}`, {
        method: 'DELETE',
      })
      onDeleted()
    } catch {
      setDeleting(false)
    }
  }

  const recurrenceLabel = () => {
    if (!event.recurrence?.length) return null
    const rule = event.recurrence[0] ?? ''
    if (rule.includes('FREQ=DAILY')) return lang === 'pt' ? 'Repete-se diariamente' : 'Repeats daily'
    if (rule.includes('INTERVAL=2')) return lang === 'pt' ? 'Repete-se de 2 em 2 semanas' : 'Repeats every 2 weeks'
    if (rule.includes('FREQ=WEEKLY') && rule.includes('BYDAY=MO,TU,WE,TH,FR')) return lang === 'pt' ? 'Repete-se dias úteis' : 'Repeats weekdays'
    if (rule.includes('FREQ=WEEKLY')) return lang === 'pt' ? 'Repete-se semanalmente' : 'Repeats weekly'
    if (rule.includes('FREQ=MONTHLY')) return lang === 'pt' ? 'Repete-se mensalmente' : 'Repeats monthly'
    if (rule.includes('FREQ=YEARLY')) return lang === 'pt' ? 'Repete-se anualmente' : 'Repeats yearly'
    return null
  }

  return (
    <Modal open onClose={onClose} width={520}>
      <div style={{ padding: '24px 24px 20px' }}>
        {/* Color bar */}
        <div style={{
          height: 4, borderRadius: 2, marginBottom: 16, marginTop: -4,
          background: event.color ?? calendar?.backgroundColor ?? 'var(--c-cal)',
        }} />

        {/* Title */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 16, lineHeight: 1.3 }}>
          {event.title}
        </div>

        {/* Calendar */}
        {calendar && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: calendar.backgroundColor, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{calendar.summary}</span>
          </div>
        )}

        {/* Date / time */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <span style={{ color: 'var(--ink-faint)', marginTop: 1 }}><Icon name="calendar" size={14} /></span>
          <div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{formatEventDateFull(event, lang)}</div>
            {!event.allDay && (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{eventDuration(event)}</div>
            )}
          </div>
        </div>

        {/* Recurrence */}
        {recurrenceLabel() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ color: 'var(--ink-faint)' }}><Icon name="refresh" size={13} /></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{recurrenceLabel()}</span>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <span style={{ color: 'var(--ink-faint)', marginTop: 1 }}><Icon name="pin" size={14} /></span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 14, color: 'var(--c-cal)', textDecoration: 'none' }}
            >
              {event.location}
            </a>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6, margin: 0 }}>
              {event.description.replace(/<[^>]*>/g, '')}
            </p>
          </div>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 8, letterSpacing: '0.06em' }}>
              {lang === 'pt' ? 'PARTICIPANTES' : 'ATTENDEES'} · {event.attendees.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {event.attendees.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--bg-raised-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)',
                  }}>
                    {getInitials(a.name, a.email)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: a.self ? 600 : 400 }}>
                      {a.name ?? a.email}
                      {a.organizer && <span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>ORG</span>}
                    </div>
                    {a.name && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{a.email}</div>}
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: RESPONSE_COLORS[a.responseStatus] ?? 'var(--ink-faint)',
                  }} title={lang === 'pt' ? RESPONSE_LABELS[a.responseStatus]?.pt : RESPONSE_LABELS[a.responseStatus]?.en} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminders */}
        {event.reminders.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {event.reminders.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', padding: '4px 8px',
                fontSize: 11, color: 'var(--ink-faint)',
              }}>
                <Icon name="clock" size={11} />
                {r.minutes < 60
                  ? `${r.minutes}${lang === 'pt' ? ' min antes' : ' min before'}`
                  : r.minutes < 1440
                  ? `${r.minutes / 60}h ${lang === 'pt' ? 'antes' : 'before'}`
                  : `${r.minutes / 1440}d ${lang === 'pt' ? 'antes' : 'before'}`}
              </div>
            ))}
          </div>
        )}

        {/* Delete confirm for recurring */}
        {deleteMode === 'ask' && (
          <div style={{ marginBottom: 14, padding: '12px', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--edge-soft)' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
              {lang === 'pt' ? 'Apagar eventos recorrentes?' : 'Delete recurring events?'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['this', 'following', 'all'] as const).map(m => (
                <button
                  key={m}
                  className="btn"
                  disabled={deleting}
                  onClick={() => handleDelete(m)}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  {lang === 'pt'
                    ? { this: 'Este', following: 'Este e seguintes', all: 'Todos' }[m]
                    : { this: 'This', following: 'Following', all: 'All' }[m]
                  }
                </button>
              ))}
              <button className="btn" onClick={() => setDeleteMode(null)} style={{ fontSize: 12, padding: '6px 12px' }}>
                {lang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--edge-soft)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => onEdit(event)} style={{ fontSize: 13, padding: '8px 14px' }}>
              <Icon name="edit" size={13} />
              {lang === 'pt' ? 'Editar' : 'Edit'}
            </button>
            <button
              className="btn"
              onClick={() => isRecurring ? setDeleteMode('ask') : handleDelete('this')}
              disabled={deleting}
              style={{
                fontSize: 13, padding: '8px 14px',
                color: deleteMode || deleting ? 'var(--neg)' : undefined,
              }}
            >
              <Icon name="trash" size={13} />
              {lang === 'pt' ? 'Apagar' : 'Delete'}
            </button>
          </div>
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Icon name="link" size={11} />
              {lang === 'pt' ? 'Abrir no Google' : 'Open in Google'}
            </a>
          )}
        </div>
      </div>
    </Modal>
  )
}

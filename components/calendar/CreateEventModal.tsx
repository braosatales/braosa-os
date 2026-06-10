"use client"

import { useState, useEffect, useRef } from 'react'
import { Modal, Icon } from '@/components/ui'
import { useLang } from '@/lib/i18n'
import type { CalendarEvent, GoogleCalendar } from '@/lib/calendar'
import { RECURRENCE_OPTIONS, GOOGLE_COLOR_MAP, recurrenceValueToRRule } from '@/lib/calendar'

type Props = {
  initial: Partial<CalendarEvent> | null
  calendars: GoogleCalendar[]
  onClose: () => void
  onSaved: () => void
}

function toDateInput(iso: string): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

function toTimeInput(iso: string): string {
  if (!iso || !iso.includes('T')) return ''
  return iso.split('T')[1]?.slice(0, 5) ?? ''
}

function combineDatetime(date: string, time: string): string {
  if (!date) return ''
  if (!time) return `${date}T00:00:00`
  return `${date}T${time}:00`
}

const COLOR_OPTIONS = [
  { id: null,  label: 'Default',   css: 'var(--c-cal)' },
  { id: '1',   label: 'Tomato',    css: 'var(--c-health)' },
  { id: '2',   label: 'Flamingo',  css: 'var(--c-fin)' },
  { id: '3',   label: 'Tangerine', css: 'var(--c-fin)' },
  { id: '4',   label: 'Banana',    css: 'var(--c-cal)' },
  { id: '6',   label: 'Basil',     css: 'var(--c-braosa)' },
  { id: '7',   label: 'Peacock',   css: 'var(--c-braosa)' },
  { id: '8',   label: 'Blueberry', css: 'var(--c-mail)' },
  { id: '9',   label: 'Lavender',  css: 'var(--c-task)' },
  { id: '10',  label: 'Grape',     css: 'var(--c-verum)' },
  { id: '11',  label: 'Graphite',  css: 'var(--ink-dim)' },
]

const REMINDER_PRESETS = [5, 10, 15, 30, 60, 1440]

export default function CreateEventModal({ initial, calendars, onClose, onSaved }: Props) {
  const lang = useLang()
  const isEdit = !!initial?.googleEventId
  const [saving, setSaving] = useState(false)

  // Determine default calendar
  const defaultCalId = initial?.calendarId ?? calendars.find(c => c.primary)?.id ?? calendars[0]?.id ?? 'primary'

  const initStart = initial?.start ? new Date(initial.start) : new Date()
  if (!initial?.start) { initStart.setMinutes(Math.ceil(initStart.getMinutes() / 15) * 15, 0, 0) }
  const initEnd = initial?.end ? new Date(initial.end) : new Date(initStart.getTime() + 60 * 60000)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [allDay, setAllDay] = useState(initial?.allDay ?? false)
  const [startDate, setStartDate] = useState(toDateInput(initStart.toISOString()))
  const [startTime, setStartTime] = useState(toTimeInput(initStart.toISOString()))
  const [endDate, setEndDate] = useState(toDateInput(initEnd.toISOString()))
  const [endTime, setEndTime] = useState(toTimeInput(initEnd.toISOString()))
  const [location, setLocation] = useState(initial?.location ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [calendarId, setCalendarId] = useState(defaultCalId)
  const [colorId, setColorId] = useState<string | null>(null)
  const [attendeeInput, setAttendeeInput] = useState('')
  const [attendees, setAttendees] = useState<string[]>(initial?.attendees?.map(a => a.email) ?? [])
  const [recurrence, setRecurrence] = useState<string | null>(null)
  const [reminders, setReminders] = useState<{ method: string; minutes: number }[]>([
    { method: 'popup', minutes: 15 },
  ])
  // Custom recurrence
  const [customInterval, setCustomInterval] = useState(1)
  const [customUnit, setCustomUnit] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY')
  const [customDays, setCustomDays] = useState<string[]>([])
  const [customEnds, setCustomEnds] = useState<'never' | 'date' | 'count'>('never')
  const [customEndDate, setCustomEndDate] = useState('')
  const [customEndCount, setCustomEndCount] = useState(10)

  // Recurring edit mode
  const [recurringEditMode, setRecurringEditMode] = useState<'this' | 'following' | 'all' | null>(
    isEdit && (initial?.recurrence?.length || initial?.recurringEventId) ? null : 'this'
  )
  const isRecurring = isEdit && !!(initial?.recurrence?.length || initial?.recurringEventId)

  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 50) }, [])

  // Contact search for attendees
  const [contactSuggestions, setContactSuggestions] = useState<{ email: string; name: string }[]>([])
  useEffect(() => {
    if (!attendeeInput || attendeeInput.length < 2) { setContactSuggestions([]); return }
    fetch(`/api/contacts?search=${encodeURIComponent(attendeeInput)}&limit=5`)
      .then(r => r.ok ? r.json() : { contacts: [] })
      .then(d => {
        const suggestions = (d.contacts ?? []).map((c: any) => ({
          email: c.email?.[0] ?? '',
          name: `${c.first_name} ${c.last_name ?? ''}`.trim(),
        })).filter((s: any) => s.email)
        setContactSuggestions(suggestions)
      })
      .catch(() => setContactSuggestions([]))
  }, [attendeeInput])

  const addAttendee = (email: string) => {
    if (email && !attendees.includes(email)) setAttendees(prev => [...prev, email])
    setAttendeeInput('')
    setContactSuggestions([])
  }

  const buildRRule = (): string | undefined => {
    if (!recurrence) return undefined
    if (recurrence === 'CUSTOM') {
      let rule = `FREQ=${customUnit};INTERVAL=${customInterval}`
      if (customUnit === 'WEEKLY' && customDays.length > 0) {
        rule += `;BYDAY=${customDays.join(',')}`
      }
      if (customEnds === 'date' && customEndDate) {
        rule += `;UNTIL=${customEndDate.replace(/-/g, '')}T000000Z`
      } else if (customEnds === 'count') {
        rule += `;COUNT=${customEndCount}`
      }
      return rule
    }
    return recurrenceValueToRRule(recurrence)
  }

  const handleSave = async () => {
    if (!title.trim()) { titleRef.current?.focus(); return }
    setSaving(true)
    try {
      const startISO = allDay ? startDate : combineDatetime(startDate, startTime)
      const endISO = allDay ? endDate : combineDatetime(endDate, endTime)

      if (isEdit && isRecurring && !recurringEditMode) return // waiting for mode selection

      const body = {
        calendarId,
        title: title.trim(),
        description: description || undefined,
        location: location || undefined,
        start: startISO,
        end: endISO,
        allDay,
        attendeeEmails: attendees,
        recurrence: buildRRule(),
        colorId: colorId ?? undefined,
        reminders,
        ...(isEdit ? { updateMode: recurringEditMode ?? 'this', recurringEventId: initial?.recurringEventId } : {}),
      }

      const url = isEdit
        ? `/api/calendar/events/${initial!.googleEventId}`
        : '/api/calendar/events'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) onSaved()
    } catch {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-inset)', border: '1px solid var(--edge-soft)',
    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
    color: 'var(--ink)', fontSize: 13, outline: 'none', width: '100%',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)',
    letterSpacing: '0.06em', marginBottom: 4, display: 'block',
  }

  // If recurring edit and mode not selected
  if (isEdit && isRecurring && recurringEditMode === null) {
    return (
      <Modal open onClose={onClose} width={420}>
        <div style={{ padding: '28px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            {lang === 'pt' ? 'Editar evento recorrente' : 'Edit recurring event'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['this', 'following', 'all'] as const).map(m => (
              <button
                key={m}
                className="btn"
                onClick={() => setRecurringEditMode(m)}
                style={{ justifyContent: 'flex-start', fontSize: 13, padding: '10px 14px' }}
              >
                {lang === 'pt'
                  ? { this: 'Este evento', following: 'Este e seguintes', all: 'Todos os eventos' }[m]
                  : { this: 'This event', following: 'This and following', all: 'All events' }[m]
                }
              </button>
            ))}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} width={580}>
      <div style={{ padding: '24px 24px 20px' }}>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={lang === 'pt' ? 'Título do evento' : 'Event title'}
            style={{
              ...inputStyle,
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600,
              padding: '10px 12px',
            }}
          />
        </div>

        {/* All day toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setAllDay(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: allDay ? 'var(--c-cal-dim)' : 'var(--bg-inset)',
              border: `1px solid ${allDay ? 'var(--c-cal)' : 'var(--edge-soft)'}`,
              color: allDay ? 'var(--c-cal)' : 'var(--ink-dim)',
              borderRadius: 99, padding: '5px 12px', cursor: 'pointer', fontSize: 12,
            }}
          >
            <Icon name="calendar" size={12} />
            {lang === 'pt' ? 'Dia inteiro' : 'All day'}
          </button>
        </div>

        {/* Date + Time */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: allDay ? 1 : undefined }}>
            <label style={labelStyle}>{lang === 'pt' ? 'INÍCIO' : 'START'}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              {!allDay && <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />}
            </div>
          </div>
          <div style={{ flex: allDay ? 1 : undefined }}>
            <label style={labelStyle}>{lang === 'pt' ? 'FIM' : 'END'}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              {!allDay && <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />}
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{lang === 'pt' ? 'LOCALIZAÇÃO' : 'LOCATION'}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 10, color: 'var(--ink-faint)' }}><Icon name="pin" size={13} /></span>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={lang === 'pt' ? 'Adicionar localização' : 'Add location'}
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{lang === 'pt' ? 'DESCRIÇÃO' : 'DESCRIPTION'}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={lang === 'pt' ? 'Adicionar notas' : 'Add notes'}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* Calendar selector */}
        {calendars.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{lang === 'pt' ? 'CALENDÁRIO' : 'CALENDAR'}</label>
            <select
              value={calendarId}
              onChange={e => setCalendarId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {calendars.map(c => (
                <option key={c.id} value={c.id}>{c.summary}</option>
              ))}
            </select>
          </div>
        )}

        {/* Attendees */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{lang === 'pt' ? 'PARTICIPANTES' : 'ATTENDEES'}</label>
          {attendees.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {attendees.map(email => (
                <div key={email} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)',
                  borderRadius: 99, padding: '3px 8px', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--ink-dim)' }}>{email}</span>
                  <button onClick={() => setAttendees(p => p.filter(e => e !== email))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 0, display: 'flex' }}>
                    <Icon name="close" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <input
              value={attendeeInput}
              onChange={e => setAttendeeInput(e.target.value)}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ',') && attendeeInput.includes('@')) {
                  e.preventDefault(); addAttendee(attendeeInput.trim())
                }
              }}
              placeholder={lang === 'pt' ? 'Adicionar email' : 'Add email'}
              style={inputStyle}
            />
            {contactSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow-pop)',
              }}>
                {contactSuggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => addAttendee(s.email)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      display: 'flex', gap: 8, alignItems: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--ink-soft)' }}>{s.name}</span>
                    <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{s.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{lang === 'pt' ? 'COR' : 'COLOR'}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {COLOR_OPTIONS.map(c => (
              <div
                key={String(c.id)}
                onClick={() => setColorId(c.id)}
                title={c.label}
                style={{
                  width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                  background: c.css,
                  outline: colorId === c.id ? `2px solid var(--ink)` : '2px solid transparent',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Recurrence */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{lang === 'pt' ? 'REPETIÇÃO' : 'RECURRENCE'}</label>
          <select
            value={recurrence ?? ''}
            onChange={e => setRecurrence(e.target.value || null)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {RECURRENCE_OPTIONS.map(r => (
              <option key={String(r.value)} value={r.value ?? ''}>
                {lang === 'pt' ? r.label_pt : r.label_en}
              </option>
            ))}
          </select>

          {recurrence === 'CUSTOM' && (
            <div style={{ marginTop: 10, padding: 12, background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{lang === 'pt' ? 'A cada' : 'Every'}</span>
                <input type="number" min={1} value={customInterval} onChange={e => setCustomInterval(Number(e.target.value))} style={{ ...inputStyle, width: 56 }} />
                <select value={customUnit} onChange={e => setCustomUnit(e.target.value as any)} style={{ ...inputStyle, width: 'auto' }}>
                  <option value="DAILY">{lang === 'pt' ? 'dia(s)' : 'day(s)'}</option>
                  <option value="WEEKLY">{lang === 'pt' ? 'semana(s)' : 'week(s)'}</option>
                  <option value="MONTHLY">{lang === 'pt' ? 'mês/meses' : 'month(s)'}</option>
                  <option value="YEARLY">{lang === 'pt' ? 'ano(s)' : 'year(s)'}</option>
                </select>
              </div>
              {customUnit === 'WEEKLY' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['MO','TU','WE','TH','FR','SA','SU'].map((day, i) => {
                    const labels = lang === 'pt' ? ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                    const on = customDays.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() => setCustomDays(p => on ? p.filter(d => d !== day) : [...p, day])}
                        style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none',
                          background: on ? 'var(--c-cal-dim)' : 'var(--bg-raised-2)',
                          color: on ? 'var(--c-cal)' : 'var(--ink-dim)',
                          outline: on ? '1px solid var(--c-cal)' : 'none',
                        }}
                      >{labels[i]}</button>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{lang === 'pt' ? 'Termina:' : 'Ends:'}</span>
                <select value={customEnds} onChange={e => setCustomEnds(e.target.value as any)} style={{ ...inputStyle, width: 'auto' }}>
                  <option value="never">{lang === 'pt' ? 'Nunca' : 'Never'}</option>
                  <option value="date">{lang === 'pt' ? 'Na data' : 'On date'}</option>
                  <option value="count">{lang === 'pt' ? 'Após N vezes' : 'After N times'}</option>
                </select>
                {customEnds === 'date' && <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />}
                {customEnds === 'count' && <input type="number" min={1} value={customEndCount} onChange={e => setCustomEndCount(Number(e.target.value))} style={{ ...inputStyle, width: 64 }} />}
              </div>
            </div>
          )}
        </div>

        {/* Reminders */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{lang === 'pt' ? 'LEMBRETES' : 'REMINDERS'}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reminders.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={r.method}
                  onChange={e => setReminders(prev => prev.map((rem, j) => j === i ? { ...rem, method: e.target.value } : rem))}
                  style={{ ...inputStyle, width: 'auto' }}
                >
                  <option value="popup">{lang === 'pt' ? 'Notificação' : 'Notification'}</option>
                  <option value="email">Email</option>
                </select>
                <select
                  value={r.minutes}
                  onChange={e => setReminders(prev => prev.map((rem, j) => j === i ? { ...rem, minutes: Number(e.target.value) } : rem))}
                  style={{ ...inputStyle, width: 'auto' }}
                >
                  {REMINDER_PRESETS.map(m => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m}${lang === 'pt' ? ' min' : ' min'}` : m < 1440 ? `${m/60}h` : `${m/1440}${lang === 'pt' ? ' dia' : 'd'}`}
                    </option>
                  ))}
                </select>
                <button onClick={() => setReminders(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
            <button
              className="btn"
              onClick={() => setReminders(p => [...p, { method: 'popup', minutes: 15 }])}
              style={{ alignSelf: 'flex-start', fontSize: 12, padding: '6px 12px' }}
            >
              <Icon name="plus" size={12} />
              {lang === 'pt' ? 'Adicionar lembrete' : 'Add reminder'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--edge-soft)' }}>
          <button className="btn" onClick={onClose} style={{ fontSize: 13 }}>
            {lang === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            className="btn-accent btn"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{ '--accent': 'var(--c-cal)', fontSize: 13 } as React.CSSProperties}
          >
            {saving ? (lang === 'pt' ? 'A guardar…' : 'Saving…') : (lang === 'pt' ? 'Guardar' : 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

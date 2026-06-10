import { getLang } from './i18n'

export type CalendarEvent = {
  id: string
  googleEventId: string
  calendarId: string
  title: string
  description: string | null
  location: string | null
  start: string // ISO datetime or date
  end: string
  allDay: boolean
  color: string | null
  status: 'confirmed' | 'tentative' | 'cancelled'
  attendees: {
    email: string
    name: string | null
    responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction'
    self?: boolean
    organizer?: boolean
  }[]
  recurrence: string[] | null
  recurringEventId: string | null
  htmlLink: string
  organizer: { email: string; name: string | null }
  reminders: { method: string; minutes: number }[]
  created: string
  updated: string
}

export type GoogleCalendar = {
  id: string
  summary: string
  description: string | null
  backgroundColor: string
  foregroundColor: string
  primary: boolean
  selected: boolean
  accessRole: string
}

export type CalendarView = 'day' | 'week' | 'month'

export const RECURRENCE_OPTIONS = [
  { value: null,         label_pt: 'Não se repete',      label_en: 'Does not repeat' },
  { value: 'DAILY',      label_pt: 'Todos os dias',       label_en: 'Every day' },
  { value: 'WEEKLY',     label_pt: 'Todas as semanas',    label_en: 'Every week' },
  { value: 'BIWEEKLY',   label_pt: 'De 2 em 2 semanas',   label_en: 'Every 2 weeks' },
  { value: 'MONTHLY',    label_pt: 'Todos os meses',      label_en: 'Every month' },
  { value: 'YEARLY',     label_pt: 'Todos os anos',       label_en: 'Every year' },
  { value: 'WEEKDAYS',   label_pt: 'Dias úteis (Seg–Sex)', label_en: 'Weekdays (Mon–Fri)' },
  { value: 'CUSTOM',     label_pt: 'Personalizado',       label_en: 'Custom' },
]

export const GOOGLE_COLOR_MAP: Record<string, string> = {
  '1':  'var(--c-health)',
  '2':  'var(--c-fin)',
  '3':  'var(--c-fin)',
  '4':  'var(--c-cal)',
  '5':  'var(--c-cal)',
  '6':  'var(--c-braosa)',
  '7':  'var(--c-braosa)',
  '8':  'var(--c-mail)',
  '9':  'var(--c-task)',
  '10': 'var(--c-verum)',
  '11': 'var(--ink-dim)',
}

export function eventDuration(event: CalendarEvent): string {
  if (event.allDay) {
    const lang = getLang()
    return lang === 'pt' ? 'Dia inteiro' : 'All day'
  }
  const start = new Date(event.start)
  const end = new Date(event.end)
  const mins = Math.round((end.getTime() - start.getTime()) / 60000)
  if (mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function getEventColor(event: CalendarEvent, calendar: GoogleCalendar): string {
  if (event.color) return event.color
  // Try to map calendar background color to CSS var by matching known calendar colors
  // Fall back to c-cal
  return calendar.backgroundColor ?? 'var(--c-cal)'
}

export function googleColorIdToCssVar(colorId: string | null | undefined): string {
  if (!colorId) return 'var(--c-cal)'
  return GOOGLE_COLOR_MAP[colorId] ?? 'var(--c-cal)'
}

export function recurrenceValueToRRule(value: string): string {
  switch (value) {
    case 'DAILY':     return 'FREQ=DAILY'
    case 'WEEKLY':    return 'FREQ=WEEKLY'
    case 'BIWEEKLY':  return 'FREQ=WEEKLY;INTERVAL=2'
    case 'MONTHLY':   return 'FREQ=MONTHLY'
    case 'YEARLY':    return 'FREQ=YEARLY'
    case 'WEEKDAYS':  return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    default:          return value
  }
}

export function formatEventTime(event: CalendarEvent, lang: string): string {
  if (event.allDay) return lang === 'pt' ? 'Dia inteiro' : 'All day'
  const start = new Date(event.start)
  const end = new Date(event.end)
  const locale = lang === 'pt' ? 'pt-PT' : 'en-IE'
  const startStr = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const endStr = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${startStr}–${endStr}`
}

export function formatEventDateFull(event: CalendarEvent, lang: string): string {
  const locale = lang === 'pt' ? 'pt-PT' : 'en-IE'
  const start = new Date(event.start)
  const end = new Date(event.end)

  if (event.allDay) {
    const dateStr = start.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    return lang === 'pt' ? `${dateStr} · Dia inteiro` : `${dateStr} · All day`
  }

  const dateStr = start.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const startTime = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} · ${startTime}–${endTime}`
}

export function parseGoogleEvent(raw: any, calendarId: string): CalendarEvent {
  const allDay = !!(raw.start?.date && !raw.start?.dateTime)
  const start = raw.start?.dateTime ?? raw.start?.date ?? ''
  const end = raw.end?.dateTime ?? raw.end?.date ?? ''

  const attendees = (raw.attendees ?? []).map((a: any) => ({
    email: a.email ?? '',
    name: a.displayName ?? null,
    responseStatus: a.responseStatus ?? 'needsAction',
    self: !!a.self,
    organizer: !!a.organizer,
  }))

  const reminders = (raw.reminders?.overrides ?? []).map((r: any) => ({
    method: r.method,
    minutes: r.minutes,
  }))

  const colorId = raw.colorId ?? null
  const color = colorId ? (GOOGLE_COLOR_MAP[colorId] ?? null) : null

  return {
    id: raw.id ?? '',
    googleEventId: raw.id ?? '',
    calendarId,
    title: raw.summary ?? '',
    description: raw.description ?? null,
    location: raw.location ?? null,
    start,
    end,
    allDay,
    color,
    status: raw.status ?? 'confirmed',
    attendees,
    recurrence: raw.recurrence ?? null,
    recurringEventId: raw.recurringEventId ?? null,
    htmlLink: raw.htmlLink ?? '',
    organizer: {
      email: raw.organizer?.email ?? '',
      name: raw.organizer?.displayName ?? null,
    },
    reminders,
    created: raw.created ?? new Date().toISOString(),
    updated: raw.updated ?? new Date().toISOString(),
  }
}

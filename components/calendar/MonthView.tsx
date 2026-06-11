"use client"

import { useMemo } from 'react'
import { useLang } from '@/lib/i18n'
import type { CalendarEvent } from '@/lib/calendar'
import { formatEventTime } from '@/lib/calendar'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

type Props = {
  date: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onDayClick: (d: Date) => void
}

const DAY_NAMES_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getEventStartDate(e: CalendarEvent): Date {
  return new Date(e.start)
}

export default function MonthView({ date, events, onEventClick, onDayClick }: Props) {
  const lang = useLang()
  const isMobile = useIsMobile()
  const today = new Date()
  today.setHours(0,0,0,0)

  const days = useMemo(() => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    // Monday-based: 0=Mon … 6=Sun
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6

    const result: Date[] = []
    const start = new Date(firstDay)
    start.setDate(start.getDate() - startOffset)

    for (let i = 0; i < 42; i++) {
      result.push(new Date(start))
      start.setDate(start.getDate() + 1)
    }
    return result
  }, [date])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const d = getEventStartDate(e)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  const dayNames = lang === 'pt' ? DAY_NAMES_PT : DAY_NAMES_EN

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--edge-soft)' }}>
        {dayNames.map(d => (
          <div key={d} style={{
            padding: '6px 8px', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
            letterSpacing: '0.06em',
          }}>
            {d.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflow: 'auto' }}>
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === date.getMonth()
          const isToday = isSameDay(day, today)
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
          const dayEvents = eventsByDay.get(key) ?? []
          const maxVisible = isMobile ? 2 : 3
          const visible = dayEvents.slice(0, maxVisible)
          const overflow = dayEvents.length - maxVisible

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              style={{
                borderRight: '1px solid var(--edge-soft)',
                borderBottom: '1px solid var(--edge-soft)',
                minHeight: 100, padding: 4, cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Day number */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: isCurrentMonth ? 13 : 12,
                  fontWeight: isToday ? 700 : 400,
                  background: isToday ? 'var(--c-cal)' : 'transparent',
                  color: isToday ? 'white' : isCurrentMonth ? 'var(--ink-soft)' : 'var(--ink-faint)',
                }}>
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visible.map(e => (
                  <div
                    key={e.id}
                    onClick={ev => { ev.stopPropagation(); onEventClick(e) }}
                    title={e.title}
                    style={{
                      borderRadius: 4, padding: '2px 6px', fontSize: 11,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      cursor: 'pointer',
                      ...(e.allDay
                        ? { background: e.color ?? 'var(--c-cal)', color: 'white', fontWeight: 500 }
                        : {
                            background: `color-mix(in oklch, ${e.color ?? 'var(--c-cal)'} 20%, var(--bg-inset))`,
                            borderLeft: `3px solid ${e.color ?? 'var(--c-cal)'}`,
                            color: 'var(--ink-soft)',
                          }
                      ),
                    }}
                  >
                    {!e.allDay && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginRight: 4, opacity: 0.7 }}>
                        {formatEventTime(e, lang).split('–')[0]}
                      </span>
                    )}
                    {e.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', padding: '0 4px' }}>
                    +{overflow} {lang === 'pt' ? 'mais' : 'more'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

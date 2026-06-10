"use client"

import { useMemo, useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/i18n'
import type { CalendarEvent } from '@/lib/calendar'

type Props = {
  date: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (d: Date) => void
}

const HOUR_HEIGHT = 48
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    return day
  })
}

function layoutEvents(events: CalendarEvent[]): { event: CalendarEvent; col: number; cols: number }[] {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  const columns: { event: CalendarEvent; end: number }[][] = []
  const result: { event: CalendarEvent; col: number; cols: number }[] = []

  for (const event of sorted) {
    const startMs = new Date(event.start).getTime()
    const endMs = new Date(event.end).getTime()
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1]
      if (lastInCol.end <= startMs) {
        columns[c].push({ event, end: endMs })
        result.push({ event, col: c, cols: 0 })
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push([{ event, end: endMs }])
      result.push({ event, col: columns.length - 1, cols: 0 })
    }
  }

  for (const item of result) {
    item.cols = columns.length
  }
  return result
}

export default function WeekView({ date, events, onEventClick, onSlotClick }: Props) {
  const lang = useLang()
  const today = new Date(); today.setHours(0,0,0,0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  const days = useMemo(() => getWeekDays(date), [date])

  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date(); setNowMinutes(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, (nowMinutes - 60) / 60 * HOUR_HEIGHT)
      scrollRef.current.scrollTop = scrollTo
    }
  }, [])

  const locale = lang === 'pt' ? 'pt-PT' : 'en-IE'

  const dayEvents = useMemo(() => {
    return days.map(day => {
      const timed = events.filter(e => !e.allDay && isSameDay(new Date(e.start), day))
      const allDay = events.filter(e => e.allDay && isSameDay(new Date(e.start), day))
      return { timed, allDay }
    })
  }, [days, events])

  const isThisWeek = days.some(d => isSameDay(d, today))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--edge-soft)', flexShrink: 0 }}>
        <div />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayName = day.toLocaleDateString(locale, { weekday: 'short' })
          return (
            <div key={i} style={{
              padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid var(--edge-soft)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dayName}
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', margin: '3px auto 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? 'var(--c-cal)' : 'transparent',
                color: isToday ? 'white' : 'var(--ink-soft)',
                fontSize: 13, fontWeight: isToday ? 700 : 400,
              }}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      {dayEvents.some(d => d.allDay.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--edge-soft)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', padding: '4px 6px', textAlign: 'right', alignSelf: 'center' }}>
            {lang === 'pt' ? 'DIA INT.' : 'ALL DAY'}
          </div>
          {dayEvents.map(({ allDay }, i) => (
            <div key={i} style={{ borderLeft: '1px solid var(--edge-soft)', padding: '4px 3px', minHeight: 28, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allDay.map(e => (
                <div
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  style={{
                    borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer',
                    background: e.color ?? 'var(--c-cal)', color: 'white',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}
                >
                  {e.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative', minHeight: 24 * HOUR_HEIGHT }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{
                height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start',
                justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2,
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
              }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIdx) => {
            const timedEvents = dayEvents[colIdx].timed
            const laid = layoutEvents(timedEvents)

            return (
              <div
                key={colIdx}
                style={{ borderLeft: '1px solid var(--edge-soft)', position: 'relative' }}
                onClick={e => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const minutes = Math.floor(y / HOUR_HEIGHT * 60 / 15) * 15
                  const slotDate = new Date(day)
                  slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
                  onSlotClick(slotDate)
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div key={h} style={{
                    position: 'absolute', left: 0, right: 0,
                    top: h * HOUR_HEIGHT, height: 1,
                    background: 'var(--edge-soft)',
                    pointerEvents: 'none',
                  }} />
                ))}

                {/* Current time indicator */}
                {isThisWeek && isSameDay(day, today) && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0,
                    top: (nowMinutes / 60) * HOUR_HEIGHT,
                    height: 2, background: 'var(--neg)', zIndex: 10, pointerEvents: 'none',
                    borderRadius: 1,
                  }}>
                    <div style={{
                      position: 'absolute', left: -4, top: -3,
                      width: 8, height: 8, borderRadius: '50%', background: 'var(--neg)',
                    }} />
                  </div>
                )}

                {/* Events */}
                {laid.map(({ event: e, col, cols }) => {
                  const startD = new Date(e.start)
                  const endD = new Date(e.end)
                  const startMin = startD.getHours() * 60 + startD.getMinutes()
                  const endMin = endD.getHours() * 60 + endD.getMinutes()
                  const top = (startMin / 60) * HOUR_HEIGHT
                  const height = Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT)
                  const width = cols > 1 ? `calc(${90 / cols}% )` : '90%'
                  const left = cols > 1 ? `calc(${(col / cols) * 90}%)` : '2%'

                  return (
                    <div
                      key={e.id}
                      onClick={ev => { ev.stopPropagation(); onEventClick(e) }}
                      style={{
                        position: 'absolute', top, height, left, width,
                        borderRadius: 5, padding: '3px 6px',
                        background: `color-mix(in oklch, ${e.color ?? 'var(--c-cal)'} 18%, var(--bg-raised))`,
                        borderLeft: `3px solid ${e.color ?? 'var(--c-cal)'}`,
                        cursor: 'pointer', overflow: 'hidden', zIndex: 5,
                        fontSize: 11, lineHeight: 1.3,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--ink-soft)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{e.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                        {startD.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

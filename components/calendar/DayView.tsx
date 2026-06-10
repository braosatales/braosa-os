"use client"

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/i18n'
import type { CalendarEvent } from '@/lib/calendar'

type Props = {
  date: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (d: Date) => void
}

const HOUR_HEIGHT = 56
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function DayView({ date, events, onEventClick, onSlotClick }: Props) {
  const lang = useLang()
  const today = new Date(); today.setHours(0,0,0,0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  const locale = lang === 'pt' ? 'pt-PT' : 'en-IE'
  const isToday = isSameDay(date, today)

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

  const dayTimed = events.filter(e => !e.allDay && isSameDay(new Date(e.start), date))
  const dayAllDay = events.filter(e => e.allDay && isSameDay(new Date(e.start), date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Date header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--edge-soft)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isToday ? 'var(--c-cal)' : 'var(--bg-raised-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
          color: isToday ? 'white' : 'var(--ink)',
        }}>
          {date.getDate()}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {date.toLocaleDateString(locale, { weekday: 'long', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {dayTimed.length + dayAllDay.length} {lang === 'pt' ? 'eventos' : 'events'}
          </div>
        </div>
      </div>

      {/* All-day events */}
      {dayAllDay.length > 0 && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--edge-soft)', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {dayAllDay.map(e => (
            <div
              key={e.id}
              onClick={() => onEventClick(e)}
              style={{
                borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                background: e.color ?? 'var(--c-cal)', color: 'white', fontWeight: 500,
              }}
            >
              {e.title}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', position: 'relative', minHeight: 24 * HOUR_HEIGHT }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{
                height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start',
                justifyContent: 'flex-end', paddingRight: 10, paddingTop: 4,
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
              }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div
            style={{ borderLeft: '1px solid var(--edge-soft)', position: 'relative' }}
            onClick={e => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              const y = e.clientY - rect.top
              const minutes = Math.floor(y / HOUR_HEIGHT * 60 / 15) * 15
              const slotDate = new Date(date)
              slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
              onSlotClick(slotDate)
            }}
          >
            {HOURS.map(h => (
              <div key={h} style={{
                position: 'absolute', left: 0, right: 0, top: h * HOUR_HEIGHT,
                height: 1, background: 'var(--edge-soft)', pointerEvents: 'none',
              }} />
            ))}

            {isToday && (
              <div style={{
                position: 'absolute', left: 0, right: 0,
                top: (nowMinutes / 60) * HOUR_HEIGHT,
                height: 2, background: 'var(--neg)', zIndex: 10, pointerEvents: 'none', borderRadius: 1,
              }}>
                <div style={{
                  position: 'absolute', left: -4, top: -3,
                  width: 8, height: 8, borderRadius: '50%', background: 'var(--neg)',
                }} />
              </div>
            )}

            {dayTimed.map(e => {
              const startD = new Date(e.start)
              const endD = new Date(e.end)
              const startMin = startD.getHours() * 60 + startD.getMinutes()
              const endMin = endD.getHours() * 60 + endD.getMinutes()
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = Math.max(32, ((endMin - startMin) / 60) * HOUR_HEIGHT)

              return (
                <div
                  key={e.id}
                  onClick={ev => { ev.stopPropagation(); onEventClick(e) }}
                  style={{
                    position: 'absolute', top, height, left: '2%', right: '4%',
                    borderRadius: 7, padding: '6px 10px',
                    background: `color-mix(in oklch, ${e.color ?? 'var(--c-cal)'} 18%, var(--bg-raised))`,
                    borderLeft: `4px solid ${e.color ?? 'var(--c-cal)'}`,
                    cursor: 'pointer', overflow: 'hidden', zIndex: 5,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 2 }}>{e.title}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                    {startD.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {endD.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {e.description && height > 56 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {e.description.replace(/<[^>]*>/g, '')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { MobileSubTabContext } from '@/lib/mobile-context'
import { Icon } from '@/components/ui'
import type { CalendarEvent, GoogleCalendar, CalendarView } from '@/lib/calendar'
import MonthView from './MonthView'
import WeekView from './WeekView'
import DayView from './DayView'
import EventDetailModal from './EventDetailModal'
import CreateEventModal from './CreateEventModal'

export default function CalendarShell() {
  const lang = useLang()
  const isMobile = useIsMobile()
  const { activeSubTab: mobileSubTab, setSubTab: setMobileSubTab } = useContext(MobileSubTabContext)

  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createInitial, setCreateInitial] = useState<Partial<CalendarEvent> | null>(null)
  const [calDropOpen, setCalDropOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const suggestionsRef = useRef<string[] | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Sync mobile sub-tab to view state
  useEffect(() => {
    if (isMobile && mobileSubTab && (mobileSubTab === 'day' || mobileSubTab === 'week' || mobileSubTab === 'month')) {
      setView(mobileSubTab as CalendarView)
    }
  }, [isMobile, mobileSubTab])

  const handleSetView = (v: CalendarView) => {
    setView(v)
    if (isMobile) setMobileSubTab(v)
  }

  // Date range for fetching
  const getRange = useCallback(() => {
    const d = new Date(currentDate)
    if (view === 'day') {
      const start = new Date(d); start.setHours(0,0,0,0)
      const end = new Date(d); end.setHours(23,59,59,999)
      return { start, end }
    }
    if (view === 'week') {
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
      const start = new Date(d); start.setDate(d.getDate() - dow); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999)
      return { start, end }
    }
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    return { start, end }
  }, [currentDate, view])

  const fetchEvents = useCallback(async () => {
    const { start, end } = getRange()
    try {
      const res = await fetch(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}&calendarId=all`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events ?? [])
      }
    } catch {}
  }, [getRange])

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/calendars')
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.calendars ?? [])
      }
    } catch {}
  }, [])

  const fetchSuggestions = useCallback(async () => {
    if (suggestionsRef.current) { setSuggestions(suggestionsRef.current); return }
    try {
      const res = await fetch('/api/calendar/ai-suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (res.ok) {
        const data = await res.json()
        suggestionsRef.current = data.suggestions ?? []
        setSuggestions(data.suggestions ?? [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchCalendars()
    fetchSuggestions()
  }, [fetchCalendars, fetchSuggestions])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!calDropOpen) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setCalDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calDropOpen])

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) { setCurrentDate(new Date()); return }
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const periodLabel = () => {
    const locale = lang === 'pt' ? 'pt-PT' : 'en-IE'
    if (view === 'day') {
      return currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (view === 'month') {
      const label = currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      return label.charAt(0).toUpperCase() + label.slice(1)
    }
    const { start, end } = getRange()
    const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    return `${startStr} – ${endStr}`
  }

  const visibleEvents = events.filter(e => !hiddenCalendars.has(e.calendarId))

  const handleEventClick = (e: CalendarEvent) => setSelectedEvent(e)
  const handleDayClick = (d: Date) => {
    setCurrentDate(d)
    handleSetView('day')
  }
  const handleSlotClick = (d: Date) => {
    setCreateInitial({ start: d.toISOString(), end: new Date(d.getTime() + 60 * 60000).toISOString() })
    setCreateOpen(true)
  }

  const handleEventSaved = () => {
    fetchEvents()
    setCreateOpen(false)
    setCreateInitial(null)
    setSelectedEvent(null)
  }

  const handleEditFromDetail = (e: CalendarEvent) => {
    setSelectedEvent(null)
    setCreateInitial(e)
    setCreateOpen(true)
  }

  const handleDeleteFromDetail = () => {
    setSelectedEvent(null)
    fetchEvents()
  }

  const toggleCalendar = (id: string) => {
    setHiddenCalendars(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const views: { id: CalendarView; pt: string; en: string }[] = [
    { id: 'day',   pt: 'Dia',    en: 'Day'   },
    { id: 'week',  pt: 'Semana', en: 'Week'  },
    { id: 'month', pt: 'Mês',    en: 'Month' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--edge-soft)',
        background: 'var(--bg-raised)', gap: 12, flexWrap: 'wrap',
      }}>
        {/* Left: nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" style={{ padding: '7px 10px' }} onClick={() => navigate(-1)}>
            <Icon name="chevron-left" size={14} />
          </button>
          <button className="btn" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => navigate(0)}>
            {lang === 'pt' ? 'Hoje' : 'Today'}
          </button>
          <button className="btn" style={{ padding: '7px 10px' }} onClick={() => navigate(1)}>
            <Icon name="chevron-right" size={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginLeft: 4 }}>
            {periodLabel()}
          </span>
        </div>

        {/* Center: view switcher (hidden on mobile — MobileAppContainer handles it) */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {views.map(v => (
              <button
                key={v.id}
                onClick={() => handleSetView(v.id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: view === v.id ? 'var(--c-cal-dim)' : 'transparent',
                  color: view === v.id ? 'var(--c-cal)' : 'var(--ink-dim)',
                  outline: view === v.id ? '1px solid var(--c-cal)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {lang === 'pt' ? v.pt : v.en}
              </button>
            ))}
          </div>
        )}

        {/* Right: calendar selector + add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button className="btn" style={{ padding: '7px 12px', fontSize: 12, gap: 6 }} onClick={() => setCalDropOpen(p => !p)}>
              <Icon name="cal" size={13} />
              {lang === 'pt' ? 'Calendários' : 'Calendars'}
              <Icon name="chevron-down" size={11} />
            </button>
            {calDropOpen && calendars.length > 0 && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 200,
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', padding: '8px 0', minWidth: 220,
                boxShadow: 'var(--shadow-pop)',
              }}>
                {calendars.map(cal => (
                  <div
                    key={cal.id}
                    onClick={() => toggleCalendar(cal.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', cursor: 'pointer',
                      opacity: hiddenCalendars.has(cal.id) ? 0.4 : 1,
                    }}
                  >
                    <div style={{
                      width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                      background: cal.backgroundColor,
                      border: hiddenCalendars.has(cal.id) ? '2px solid var(--edge)' : 'none',
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1 }}>{cal.summary}</span>
                    {!hiddenCalendars.has(cal.id) && <Icon name="check" size={12} />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn-accent btn"
            style={{ '--accent': 'var(--c-cal)' } as React.CSSProperties}
            onClick={() => { setCreateInitial(null); setCreateOpen(true) }}
          >
            <Icon name="plus" size={13} />
            {lang === 'pt' ? 'Evento' : 'Event'}
          </button>
        </div>
      </div>

      {/* AI suggestions bar */}
      {suggestions.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderBottom: '1px solid var(--edge-soft)',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => { setCreateInitial(null); setCreateOpen(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                background: 'var(--bg-inset)', border: '1px solid var(--edge-soft)',
                borderRadius: 'var(--radius-sm)', padding: '5px 10px', cursor: 'pointer',
              }}
            >
              <span style={{ color: 'var(--c-task)' }}><Icon name="wand" size={11} /></span>
              <span style={{ fontSize: 12, color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
          ))}
          <button
            onClick={() => { suggestionsRef.current = null; fetchSuggestions() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: '4px', flexShrink: 0 }}
          >
            <Icon name="refresh" size={13} />
          </button>
        </div>
      )}

      {/* Calendar view */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'month' && (
          <MonthView
            date={currentDate}
            events={visibleEvents}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={currentDate}
            events={visibleEvents}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}
        {view === 'day' && (
          <DayView
            date={currentDate}
            events={visibleEvents}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>

      {/* Modals */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          calendars={calendars}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEditFromDetail}
          onDeleted={handleDeleteFromDetail}
        />
      )}
      {createOpen && (
        <CreateEventModal
          initial={createInitial}
          calendars={calendars}
          onClose={() => { setCreateOpen(false); setCreateInitial(null) }}
          onSaved={handleEventSaved}
        />
      )}
    </div>
  )
}

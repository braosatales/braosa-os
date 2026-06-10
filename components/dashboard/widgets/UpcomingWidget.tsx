"use client"

import { useEffect, useState } from "react"
import WidgetShell from "../WidgetShell"
import { Icon } from "@/components/ui"
import { L, useLang } from "@/lib/i18n"
import type { CalendarEvent } from "@/lib/calendar"
import { useNavigation } from "@/app/(os)/layout"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

function formatEventTimeLabel(event: CalendarEvent, lang: string): string {
  if (event.allDay) return lang === "pt" ? "Dia inteiro" : "All day"
  const start = new Date(event.start)
  const today = new Date(); today.setHours(0,0,0,0)
  const eventDay = new Date(start); eventDay.setHours(0,0,0,0)
  const locale = lang === "pt" ? "pt-PT" : "en-IE"
  const timeStr = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return `${lang === "pt" ? "Hoje" : "Today"} ${timeStr}`
  if (diffDays === 1) return `${lang === "pt" ? "Amanhã" : "Tomorrow"} ${timeStr}`
  const dayName = start.toLocaleDateString(locale, { weekday: "short" })
  return `${dayName} ${timeStr}`
}

export default function UpcomingWidget(props: ShellProps) {
  const lang = useLang()
  const { navigate } = useNavigation()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    // Only fetch upcoming (start >= now), limit to next 3
    fetch(`/api/calendar/events?start=${now.toISOString()}&end=${end.toISOString()}&calendarId=all`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => {
        const upcoming = (d.events ?? [])
          .filter((e: CalendarEvent) => new Date(e.start) >= now)
          .slice(0, 3)
        setEvents(upcoming)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <WidgetShell title={L("Próximos Eventos", "Upcoming Events")} color="var(--c-cal)" glyph="calendar" {...props}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60 }}>
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>…</span>
          </div>
        ) : events.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 60, gap: 6 }}>
            <span style={{ color: "var(--c-cal)", opacity: 0.5 }}><Icon name="calendar" size={22} /></span>
            <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              {L("Sem eventos próximos", "No upcoming events")}
            </span>
          </div>
        ) : (
          events.map(e => (
            <div
              key={e.id}
              onClick={() => navigate("calendar")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 8px", borderRadius: "var(--radius-sm)",
                cursor: "pointer", background: "var(--bg-inset)",
                border: "1px solid var(--edge-soft)",
              }}
            >
              <div style={{
                width: 3, height: 28, borderRadius: 2, flexShrink: 0,
                background: e.color ?? "var(--c-cal)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: "var(--ink-soft)", fontWeight: 500,
                  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
                  {formatEventTimeLabel(e, lang)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetShell>
  )
}

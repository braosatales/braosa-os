"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon } from "@/components/ui"
import { useLang, L } from "@/lib/i18n"

type ProgressResponse = {
  summary: {
    currentStreak: number
  }
  thisWeek: {
    completedSessions: number
    totalPlannedSessions: number
    nextSession: { name: string; dayOfWeek: string; sessionDate: string } | null
  }
}

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

const DAY_LABELS: Record<string, { pt: string; en: string }> = {
  MO: { pt: "Seg", en: "Mon" },
  TU: { pt: "Ter", en: "Tue" },
  WE: { pt: "Qua", en: "Wed" },
  TH: { pt: "Qui", en: "Thu" },
  FR: { pt: "Sex", en: "Fri" },
  SA: { pt: "Sáb", en: "Sat" },
  SU: { pt: "Dom", en: "Sun" },
}

export default function HealthWidget(shellProps: ShellProps) {
  const lang = useLang()
  const [data, setData] = useState<ProgressResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/health/progress?period=30d")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const streak = data?.summary.currentStreak ?? 0
  const thisWeek = data?.thisWeek
  const completed = thisWeek?.completedSessions ?? 0
  const total = thisWeek?.totalPlannedSessions ?? 0
  const nextSession = thisWeek?.nextSession ?? null
  const hasPlan = total > 0

  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <WidgetShell title={L("Saúde", "Health")} color="var(--c-health)" glyph="activity" {...shellProps}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 20, borderRadius: 6, background: "var(--bg-raised-2)", animation: "skeleton-pulse 1.2s ease-in-out infinite alternate" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Current week sessions */}
          {hasPlan ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{completed}</span>{" "}
                  {L("de", "of")}{" "}
                  <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{total}</span>{" "}
                  {L("sessões", "sessions")}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--c-health)", fontWeight: 600 }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ height: 5, background: "var(--bg-raised-2)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "var(--c-health)",
                  borderRadius: 99,
                  transition: "width .4s ease",
                }} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              {L("Sem plano esta semana", "No plan this week")}
            </div>
          )}

          {/* Streak */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--c-fin)", display: "flex" }}>
              <Icon name="flame" size={14} />
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
              <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{streak}</span>{" "}
              {L("semanas seguidas", "consecutive weeks")}
            </span>
          </div>

          {/* Next session */}
          {nextSession ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--c-health)", display: "flex" }}>
                <Icon name="target" size={14} />
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{nextSession.name}</span>{" · "}
                <span>{DAY_LABELS[nextSession.dayOfWeek]?.[lang] ?? nextSession.dayOfWeek}</span>
              </span>
            </div>
          ) : hasPlan ? (
            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              {L("Sem sessões pendentes", "No pending sessions")}
            </div>
          ) : null}
        </div>
      )}
    </WidgetShell>
  )
}

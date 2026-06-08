"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon, Ring } from "@/components/ui"
import { L } from "@/lib/i18n"

type Habit = {
  id: string
  name: string
  glyph: string
  system: string | null
  streak: number
  doneToday: boolean
}

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

export default function HealthWidget(shellProps: ShellProps) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/habits-summary")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setHabits(d.habits ?? []); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const maxStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak), 0) : 0
  const bestHabit = habits.reduce<Habit | null>(
    (best, h) => (best === null || h.streak > best.streak ? h : best),
    null,
  )

  return (
    <WidgetShell title={L("Sequência de Saúde", "Health Streak")} color="var(--c-health)" glyph="activity" {...shellProps}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
          <div style={{ height: 62, width: 62, borderRadius: "50%", background: "var(--bg-raised-2)", animation: "skeleton-pulse 1.2s ease-in-out infinite alternate" }} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Ring value={Math.min(maxStreak / 30, 1)} color="var(--c-health)" size={62} stroke={6}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{maxStreak}</span>
              <span
                style={{
                  fontSize: 7.5,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                {L("DIAS", "DAYS")}
              </span>
            </div>
          </Ring>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "var(--c-health)", display: "flex" }}><Icon name="flame" size={14} /></span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {maxStreak}{L("-dia sequência", "-day streak")}
              </span>
            </div>
            {bestHabit && maxStreak > 0 ? (
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {L("Melhor:", "Best:")} {bestHabit.name}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>
                {L("Começa o teu primeiro hábito", "Start your first habit")}
              </span>
            )}
          </div>
        </div>
      )}
    </WidgetShell>
  )
}

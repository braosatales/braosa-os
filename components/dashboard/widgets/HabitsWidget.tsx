"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon, EmptyState } from "@/components/ui"
import { burstConfetti } from "@/lib/confetti"
import { L } from "@/lib/i18n"
import { SYSTEMS } from "@/lib/constants"

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

export default function HabitsWidget(shellProps: ShellProps) {
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

  function handleToggle(e: React.MouseEvent, habit: Habit) {
    const wasDone = habit.doneToday
    setHabits((prev) =>
      prev.map((h) => h.id === habit.id ? { ...h, doneToday: !wasDone } : h),
    )
    if (!wasDone) burstConfetti(e.clientX, e.clientY)
    fetch("/api/dashboard/habits-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId: habit.id }),
    })
  }

  const visible = habits.slice(0, 5)

  return (
    <WidgetShell title={L("Hábitos", "Habits")} color="var(--c-health)" glyph="flame" {...shellProps}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 35, background: "var(--bg-raised-2)", borderRadius: 8, animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate` }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon="flame" title={L("Sem hábitos ainda", "No habits yet")} subtitle={L("Adiciona hábitos em Saúde", "Add habits in Health")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visible.map((habit) => {
            const sys = SYSTEMS.find((s) => s.id === habit.system)
            const dotColor = sys?.color ?? "var(--c-health)"

            return (
              <div
                key={habit.id}
                onClick={(e) => handleToggle(e, habit)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 6px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: habit.doneToday ? "color-mix(in oklch, var(--c-health) 8%, transparent)" : "transparent",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {habit.name}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--c-health)", flexShrink: 0 }}>
                  <Icon name="flame" size={12} />
                  <span style={{ fontSize: 11, fontFamily: "var(--font-display)", color: "var(--c-health)" }}>
                    {habit.streak}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggle(e, habit) }}
                  style={{
                    width: 19,
                    height: 19,
                    borderRadius: 6,
                    border: `1.5px solid ${habit.doneToday ? "var(--c-health)" : "var(--edge)"}`,
                    background: habit.doneToday ? "var(--c-health)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "oklch(0.18 0.01 80)",
                    padding: 0,
                  }}
                >
                  {habit.doneToday && <Icon name="check" size={11} stroke={2.5} />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </WidgetShell>
  )
}

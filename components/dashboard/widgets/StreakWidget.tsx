"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon } from "@/components/ui"
import { L } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

type StreakData = {
  topHabit: { name: string; streak: number } | null
  trainingStreak: number
}

export default function StreakWidget(props: ShellProps) {
  const [data, setData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [habitsRes, progressRes] = await Promise.all([
          fetch("/api/dashboard/habits-summary"),
          fetch("/api/health/progress?period=30d"),
        ])
        const habitsData = habitsRes.ok ? await habitsRes.json() : { habits: [] }
        const progressData = progressRes.ok ? await progressRes.json() : { summary: { currentStreak: 0 } }

        const habits = (habitsData.habits ?? []) as { name: string; streak: number }[]
        const sorted = [...habits].sort((a, b) => b.streak - a.streak)
        const topHabit = sorted[0] ? { name: sorted[0].name, streak: sorted[0].streak } : null
        const trainingStreak = (progressData.summary?.currentStreak as number) ?? 0

        if (!cancelled) {
          setData({ topHabit, trainingStreak })
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetShell title={L("Sequências", "Streaks")} color="var(--c-health)" glyph="flame" {...props}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1].map(i => (
            <div
              key={i}
              style={{
                height: 22,
                background: "var(--bg-raised-2)",
                borderRadius: 4,
                animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
              }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StreakRow
            icon="flame"
            value={data?.topHabit?.streak ?? 0}
            label={data?.topHabit?.name ?? L("Sem hábitos", "No habits")}
            color="var(--c-health)"
          />
          <StreakRow
            icon="activity"
            value={data?.trainingStreak ?? 0}
            label={L("semanas treino", "training weeks")}
            color="var(--c-health)"
          />
        </div>
      )}
    </WidgetShell>
  )
}

function StreakRow({ icon, value, label, color }: {
  icon: string
  value: number
  label: string
  color: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color, display: "flex", flexShrink: 0 }}>
        <Icon name={icon as any} size={16} />
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 600,
          color: "var(--ink)",
          lineHeight: 1,
          minWidth: 32,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--ink-faint)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  )
}

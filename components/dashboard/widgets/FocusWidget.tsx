"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon, FavStar, EmptyState } from "@/components/ui"
import { dueLabel } from "@/lib/date"
import { burstConfetti } from "@/lib/confetti"
import { L } from "@/lib/i18n"
import { SYSTEMS } from "@/lib/constants"

type Task = {
  id: string
  title: string
  priority: number
  is_favourite: boolean
  due_date: string | null
  system: string | null
  status: string
}

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

type Props = ShellProps & { onNavigate: (id: string) => void }

export default function FocusWidget({ onNavigate, ...shellProps }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dashboard/tasks-summary")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setTasks(d.tasks ?? []); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const today = new Date().toISOString().split("T")[0]

  const focused = [...tasks]
    .filter((t) => t.status !== "done" && t.status !== "cancelled" && ((t.due_date && t.due_date <= today) || t.is_favourite))
    .sort((a, b) => {
      const aOver = a.due_date && a.due_date < today ? 1 : 0
      const bOver = b.due_date && b.due_date < today ? 1 : 0
      if (bOver !== aOver) return bOver - aOver
      const aFav = a.is_favourite ? 1 : 0
      const bFav = b.is_favourite ? 1 : 0
      if (bFav !== aFav) return bFav - aFav
      return a.priority - b.priority
    })
    .slice(0, 4)

  function patchTask(id: string, patch: Record<string, unknown>) {
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }

  function handleCheck(e: React.MouseEvent, id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" } : t))
    burstConfetti(e.clientX, e.clientY)
    patchTask(id, { status: "done" })
  }

  function handleFav(id: string, current: boolean) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, is_favourite: !current } : t))
    patchTask(id, { is_favourite: !current })
  }

  return (
    <WidgetShell title={L("Foco de Hoje", "Today's Focus")} color="var(--c-task)" glyph="target" {...shellProps}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 32, background: "var(--bg-raised-2)", borderRadius: 8, animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate` }} />
            ))}
          </div>
        ) : focused.length === 0 ? (
          <EmptyState icon="target" title={L("Nada crítico agora.", "Nothing critical right now.")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {focused.map((task) => {
              const done = task.status === "done"
              const sys = SYSTEMS.find((s) => s.id === task.system)
              const dotColor = sys?.color ?? "var(--ink-faint)"
              const dl = dueLabel(task.due_date)
              const dueColor = dl?.over ? "var(--neg)" : dl?.now ? "var(--c-fin)" : "var(--ink-faint)"

              return (
                <div
                  key={task.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px" }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: done ? "var(--ink-faint)" : "var(--ink-soft)",
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    {task.title}
                  </span>
                  {dl && (
                    <span style={{ fontSize: 11, color: dueColor, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {dl.text}
                    </span>
                  )}
                  <FavStar on={task.is_favourite} onClick={() => handleFav(task.id, task.is_favourite)} size={13} />
                  <button
                    type="button"
                    onClick={(e) => handleCheck(e, task.id)}
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: 6,
                      border: `1.5px solid ${done ? "var(--pos)" : "var(--edge)"}`,
                      background: done ? "var(--pos)" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "oklch(0.18 0.01 80)",
                      padding: 0,
                    }}
                  >
                    {done && <Icon name="check" size={11} stroke={2.5} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}

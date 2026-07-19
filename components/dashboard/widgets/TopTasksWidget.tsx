"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon, FavStar, EmptyState } from "@/components/ui"
import { burstConfetti } from "@/lib/confetti"
import { L } from "@/lib/i18n"

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

const PRIORITY_STYLES: Record<number, { color: string; bg: string; icon: "arrow-up" | "minus" | "arrow-down"; label: string }> = {
  1: { color: "#EF4444", bg: "color-mix(in oklch, #EF4444 16%, transparent)", icon: "arrow-up", label: "Alta" },
  2: { color: "#EAB308", bg: "color-mix(in oklch, #EAB308 16%, transparent)", icon: "minus", label: "Média" },
  3: { color: "#22C55E", bg: "color-mix(in oklch, #22C55E 16%, transparent)", icon: "arrow-down", label: "Baixa" },
}

export default function TopTasksWidget({ onNavigate, ...shellProps }: Props) {
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

  const sorted = [...tasks]
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .sort((a, b) => {
      if (b.is_favourite !== a.is_favourite) return b.is_favourite ? 1 : -1
      return a.priority - b.priority
    })
    .slice(0, 5)

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
    <WidgetShell title={L("Top Tarefas", "Top Tasks")} color="var(--c-task)" glyph="check" {...shellProps}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 32, background: "var(--bg-raised-2)", borderRadius: 8, animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate` }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon="check" title={L("Tudo em dia", "All clear")} subtitle={L("Sem tarefas pendentes", "No pending tasks")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sorted.map((task) => {
              const done = task.status === "done"
              const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3]
              return (
                <div
                  key={task.id}
                  style={{ display: "flex", gap: 10, padding: "8px 6px", borderRadius: 8, alignItems: "center" }}
                >
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
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textDecoration: done ? "line-through" : "none",
                      color: done ? "var(--ink-faint)" : "var(--ink-soft)",
                    }}
                  >
                    {task.title}
                  </span>
                  <FavStar on={task.is_favourite} onClick={() => handleFav(task.id, task.is_favourite)} size={13} />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10.5,
                      padding: "2px 6px",
                      borderRadius: 5,
                      color: ps.color,
                      background: ps.bg,
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={ps.icon} size={10} />
                    {ps.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div
          onClick={() => onNavigate("tasks")}
          style={{ fontSize: 11, color: "var(--ink-faint)", cursor: "pointer", marginTop: "auto", paddingTop: 8 }}
        >
          {L("Ver todas →", "View all →")}
        </div>
      </div>
    </WidgetShell>
  )
}

export type TaskStatus = "todo" | "doing" | "done" | "cancelled"
export type TaskPriority = 1 | 2 | 3

export type Task = {
  id: string; user_id: string; title: string; description: string | null
  status: TaskStatus; priority: TaskPriority; fav: boolean; due: string | null
  system: string | null; project_id: string | null; tags: string[]
  external_id: string | null; source: string | null
  created_at: string; updated_at: string
}

export type Project = {
  id: string; user_id: string; name: string; color: string
  icon: string | null; created_at: string
}

export type TaskView = "today" | "board" | "list" | "timeline"

export const SYSTEM_COLORS: Record<string, string> = {
  finances: "var(--c-fin)", health: "var(--c-health)",
  braosa: "var(--c-braosa)", verum: "var(--c-verum)",
  email: "var(--c-mail)", calendar: "var(--c-cal)", default: "var(--c-task)",
}

export function taskQuadrant(task: Task): 1 | 2 | 3 | 4 {
  const urgent = task.due ? new Date(task.due) <= new Date(Date.now() + 86400000 * 2) : false
  const important = task.priority <= 2
  if (urgent && important) return 1
  if (!urgent && important) return 2
  if (urgent && !important) return 3
  return 4
}

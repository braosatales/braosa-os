import type { IconName } from "@/lib/icons"

export type WidgetId =
  | "net" | "tasks" | "assets" | "debt" | "budget"
  | "ai" | "weather" | "health" | "focus" | "habits" | "notes"
  | "finance_overview" | "upcoming" | "streak" | "quick_note" | "ai_insight"
  | "nutrition"

export type GridItem = {
  id: WidgetId
  x: number
  y: number
  w: number
  h: number
}

export type Layout = Record<WidgetId, Omit<GridItem, "id">>

export const DEFAULT_LAYOUT: Layout = {
  net:              { x: 0, y: 0,  w: 2, h: 2 },
  tasks:            { x: 2, y: 0,  w: 2, h: 2 },
  assets:           { x: 4, y: 0,  w: 1, h: 1 },
  debt:             { x: 4, y: 1,  w: 1, h: 1 },
  budget:           { x: 0, y: 2,  w: 2, h: 2 },
  ai:               { x: 2, y: 2,  w: 2, h: 2 },
  weather:          { x: 4, y: 2,  w: 1, h: 1 },
  health:           { x: 4, y: 3,  w: 1, h: 1 },
  focus:            { x: 0, y: 4,  w: 3, h: 2 },
  habits:           { x: 3, y: 4,  w: 2, h: 2 },
  notes:            { x: 0, y: 6,  w: 2, h: 2 },
  finance_overview: { x: 0, y: 10, w: 3, h: 2 },
  upcoming:         { x: 3, y: 10, w: 2, h: 2 },
  streak:           { x: 0, y: 12, w: 2, h: 1 },
  quick_note:       { x: 2, y: 12, w: 2, h: 2 },
  ai_insight:       { x: 4, y: 12, w: 1, h: 2 },
  nutrition:        { x: 2, y: 14, w: 2, h: 2 },
}

export function hasCollision(
  layout: Layout,
  visible: WidgetId[],
  moving: WidgetId,
  newPos: { x: number; y: number; w: number; h: number },
  cols: number
): boolean {
  if (newPos.x < 0 || newPos.x + newPos.w > cols) return true
  for (const id of visible) {
    if (id === moving) continue
    const b = layout[id]
    if (!b) continue
    const overlaps =
      newPos.x < b.x + b.w &&
      newPos.x + newPos.w > b.x &&
      newPos.y < b.y + b.h &&
      newPos.y + newPos.h > b.y
    if (overlaps) return true
  }
  return false
}

export function findFreePosition(
  layout: Layout,
  visible: WidgetId[],
  w: number,
  h: number,
  cols: number
): { x: number; y: number } {
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const candidate = { x, y, w, h }
      const collision = visible.some(id => {
        const b = layout[id]
        if (!b) return false
        return (
          candidate.x < b.x + b.w &&
          candidate.x + candidate.w > b.x &&
          candidate.y < b.y + b.h &&
          candidate.y + candidate.h > b.y
        )
      })
      if (!collision) return { x, y }
    }
  }
  return { x: 0, y: 0 }
}

export const ALL_WIDGETS: {
  id: WidgetId
  label: string
  color: string
  glyph: string
  description: string
}[] = [
  { id: "net",              label: "Net Worth",        color: "var(--c-fin)",    glyph: "trending-up",   description: "Net worth, assets and sparkline trend"        },
  { id: "tasks",            label: "Top Tasks",        color: "var(--c-task)",   glyph: "check",         description: "Top 5 priority tasks with quick complete"     },
  { id: "assets",           label: "Assets",           color: "var(--c-fin)",    glyph: "wallet",        description: "Total cash and invested summary"               },
  { id: "debt",             label: "Debt",             color: "var(--neg)",      glyph: "trending-down", description: "Total debt overview"                           },
  { id: "budget",           label: "Budget",           color: "var(--c-fin)",    glyph: "chart-bar",     description: "Over-budget categories alert"                  },
  { id: "ai",               label: "AI Assistant",     color: "var(--c-task)",   glyph: "wand",          description: "Quick access to Braosa AI assistant"           },
  { id: "weather",          label: "Weather",          color: "var(--c-dash)",   glyph: "cloud",         description: "Current weather conditions"                    },
  { id: "health",           label: "Health",           color: "var(--c-health)", glyph: "activity",      description: "This week's training progress"                 },
  { id: "focus",            label: "Today's Focus",    color: "var(--c-task)",   glyph: "target",        description: "Today's urgent and important tasks"            },
  { id: "habits",           label: "Habits",           color: "var(--c-health)", glyph: "flame",         description: "Daily habit tracker with streaks"              },
  { id: "notes",            label: "Notes",            color: "var(--c-task)",   glyph: "note",          description: "Recent notes with quick create"                },
  { id: "finance_overview", label: "Finance Overview", color: "var(--c-fin)",    glyph: "chart-line",    description: "Full financial snapshot at a glance"           },
  { id: "upcoming",         label: "Upcoming Events",  color: "var(--c-cal)",    glyph: "calendar",      description: "Next 3 calendar events"                        },
  { id: "streak",           label: "Streak Counter",   color: "var(--c-health)", glyph: "flame",         description: "Current training and habit streaks"            },
  { id: "quick_note",       label: "Quick Note",       color: "var(--c-task)",   glyph: "note",          description: "Instant note capture widget"                   },
  { id: "ai_insight",       label: "AI Insight",       color: "var(--c-task)",   glyph: "wand",          description: "Daily AI observation about your data"          },
  { id: "nutrition",        label: "Nutrition",        color: "var(--c-cal)",    glyph: "activity",      description: "Today's calories and macros"                   },
]

const LAYOUT_KEY = "braosa-layout"
const VISIBLE_KEY = "braosa-visible-widgets"

const DEFAULT_VISIBLE: WidgetId[] = [
  "net", "tasks", "assets", "debt", "budget", "ai", "weather", "health",
]

export function getLayout(): Layout {
  if (typeof window === "undefined") return { ...DEFAULT_LAYOUT }
  try {
    const stored = localStorage.getItem(LAYOUT_KEY)
    if (!stored) return { ...DEFAULT_LAYOUT }
    return { ...DEFAULT_LAYOUT, ...(JSON.parse(stored) as Partial<Layout>) }
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

export function saveLayout(layout: Layout): void {
  if (typeof window === "undefined") return
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
}

export function getVisibleWidgets(): WidgetId[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE
  try {
    const stored = localStorage.getItem(VISIBLE_KEY)
    if (!stored) return DEFAULT_VISIBLE
    return JSON.parse(stored) as WidgetId[]
  } catch {
    return DEFAULT_VISIBLE
  }
}

export function saveVisibleWidgets(ids: WidgetId[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(VISIBLE_KEY, JSON.stringify(ids))
}

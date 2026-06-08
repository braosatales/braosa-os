import type { IconName } from "@/lib/icons"

export type WidgetId =
  | "net" | "tasks" | "assets" | "debt" | "budget"
  | "ai" | "weather" | "health" | "focus" | "habits" | "notes"

export type GridItem = {
  id: WidgetId
  x: number
  y: number
  w: number
  h: number
}

export type Layout = Record<WidgetId, Omit<GridItem, "id">>

export const DEFAULT_LAYOUT: Layout = {
  net:     { x: 0, y: 0, w: 2, h: 2 },
  tasks:   { x: 2, y: 0, w: 2, h: 2 },
  assets:  { x: 4, y: 0, w: 1, h: 1 },
  debt:    { x: 4, y: 1, w: 1, h: 1 },
  budget:  { x: 0, y: 2, w: 2, h: 2 },
  ai:      { x: 2, y: 2, w: 2, h: 2 },
  weather: { x: 4, y: 2, w: 1, h: 1 },
  health:  { x: 4, y: 3, w: 1, h: 1 },
  focus:   { x: 0, y: 4, w: 2, h: 2 },
  habits:  { x: 2, y: 4, w: 2, h: 2 },
  notes:   { x: 4, y: 4, w: 1, h: 2 },
}

export const ALL_WIDGETS: { id: WidgetId; label: string; color: string; glyph: string }[] = [
  { id: "net",     label: "Net Worth",     color: "var(--c-fin)",    glyph: "trending-up"   },
  { id: "tasks",   label: "Top Tasks",     color: "var(--c-task)",   glyph: "check"         },
  { id: "assets",  label: "Assets",        color: "var(--c-fin)",    glyph: "wallet"        },
  { id: "debt",    label: "Debt",          color: "var(--neg)",      glyph: "trending-down" },
  { id: "budget",  label: "Budget",        color: "var(--c-fin)",    glyph: "chart-bar"     },
  { id: "ai",      label: "AI Assistant",  color: "var(--c-task)",   glyph: "wand"          },
  { id: "weather", label: "Weather",       color: "var(--c-dash)",   glyph: "cloud"         },
  { id: "health",  label: "Health",        color: "var(--c-health)", glyph: "activity"      },
  { id: "focus",   label: "Today's Focus", color: "var(--c-task)",   glyph: "target"        },
  { id: "habits",  label: "Habits",        color: "var(--c-health)", glyph: "flame"         },
  { id: "notes",   label: "Notes",         color: "var(--c-task)",   glyph: "note"          },
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

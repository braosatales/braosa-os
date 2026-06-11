"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Icon } from "@/components/ui"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import WidgetShell from "./WidgetShell"
import NetWorthWidget from "./widgets/NetWorthWidget"
import AssetsWidget from "./widgets/AssetsWidget"
import DebtWidget from "./widgets/DebtWidget"
import BudgetWidget from "./widgets/BudgetWidget"
import TopTasksWidget from "./widgets/TopTasksWidget"
import FocusWidget from "./widgets/FocusWidget"
import HabitsWidget from "./widgets/HabitsWidget"
import AIWidget from "./widgets/AIWidget"
import WeatherWidget from "./widgets/WeatherWidget"
import HealthWidget from "./widgets/HealthWidget"
import NotesWidget from "./widgets/NotesWidget"
import FinanceOverviewWidget from "./widgets/FinanceOverviewWidget"
import UpcomingWidget from "./widgets/UpcomingWidget"
import StreakWidget from "./widgets/StreakWidget"
import QuickNoteWidget from "./widgets/QuickNoteWidget"
import AIInsightWidget from "./widgets/AIInsightWidget"
import NutritionWidget from "./widgets/NutritionWidget"
import AddWidgetModal from "./AddWidgetModal"
import {
  getLayout,
  saveLayout,
  getVisibleWidgets,
  saveVisibleWidgets,
  ALL_WIDGETS,
  DEFAULT_LAYOUT,
  hasCollision,
  findFreePosition,
  type WidgetId,
  type Layout,
} from "@/lib/dashboard"
import type { IconName } from "@/lib/icons"
import { L } from "@/lib/i18n"

const CELL_SIZE = 160
const GRID_GAP = 16
const GRID_PADDING = 20

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

type DragState = { id: WidgetId; ox: number; oy: number } | null
type ResizeState = {
  id: WidgetId
  startW: number
  startH: number
  startPX: number
  startPY: number
} | null
type GhostState = { x: number; y: number; w: number; h: number } | null

const MOBILE_WIDGETS: WidgetId[] = ['net', 'focus', 'tasks', 'habits', 'nutrition', 'notes', 'ai', 'health']

export default function DashboardGrid({ onNavigate }: { onNavigate: (id: string) => void }) {
  const isMobile = useIsMobile()
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [visible, setVisible] = useState<WidgetId[]>([])
  const [dragging, setDragging] = useState<DragState>(null)
  const [resizing, setResizing] = useState<ResizeState>(null)
  const [ghost, setGhost] = useState<GhostState>(null)
  const [lifted, setLifted] = useState<WidgetId | null>(null)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [cols, setCols] = useState(5)

  // outerRef: measured by ResizeObserver, pointer-capture target, horizontal scroll wrapper
  // gridRef: inner CSS grid, used for drag/resize coordinate calculations
  const outerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const colsRef = useRef(5)

  // Refs for stale-closure-safe pointer handlers
  const draggingRef = useRef<DragState>(null)
  const resizingRef = useRef<ResizeState>(null)
  const ghostRef = useRef<GhostState>(null)
  const layoutRef = useRef<Layout>(DEFAULT_LAYOUT)
  const visibleRef = useRef<WidgetId[]>([])

  useEffect(() => {
    const l = getLayout()
    const v = getVisibleWidgets()
    layoutRef.current = l
    visibleRef.current = v
    setLayout(l)
    setVisible(v)
  }, [])

  useEffect(() => { colsRef.current = cols }, [cols])
  useEffect(() => { visibleRef.current = visible }, [visible])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const rawCols = Math.floor((w - GRID_PADDING * 2 + GRID_GAP) / (CELL_SIZE + GRID_GAP))
      const c = Math.max(2, Math.min(20, rawCols))
      setCols(c)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function handleDragStart(e: React.PointerEvent, id: WidgetId) {
    e.preventDefault()
    if (!outerRef.current || !gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const item = layoutRef.current[id]
    const widgetLeft = rect.left + GRID_PADDING + item.x * (CELL_SIZE + GRID_GAP)
    const widgetTop = rect.top + GRID_PADDING + item.y * (CELL_SIZE + GRID_GAP)
    const ox = e.clientX - widgetLeft
    const oy = e.clientY - widgetTop
    const state: DragState = { id, ox, oy }
    draggingRef.current = state
    setDragging(state)
    setLifted(id)
    const g: GhostState = { x: item.x, y: item.y, w: item.w, h: item.h }
    ghostRef.current = g
    setGhost(g)
    outerRef.current.setPointerCapture(e.pointerId)
  }

  function handleResizeStart(e: React.PointerEvent, id: WidgetId) {
    e.preventDefault()
    e.stopPropagation()
    if (!outerRef.current) return
    const item = layoutRef.current[id]
    const state: ResizeState = {
      id,
      startW: item.w,
      startH: item.h,
      startPX: e.clientX,
      startPY: e.clientY,
    }
    resizingRef.current = state
    setResizing(state)
    outerRef.current.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = draggingRef.current
    const resize = resizingRef.current

    if (drag) {
      if (!gridRef.current) return
      const rect = gridRef.current.getBoundingClientRect()
      const item = layoutRef.current[drag.id]
      const gx = Math.round((e.clientX - rect.left - GRID_PADDING - drag.ox) / (CELL_SIZE + GRID_GAP))
      const gy = Math.round((e.clientY - rect.top - GRID_PADDING - drag.oy) / (CELL_SIZE + GRID_GAP))
      const snappedX = Math.max(0, Math.min(colsRef.current - item.w, gx))
      const snappedY = Math.max(0, gy)
      const candidate = { x: snappedX, y: snappedY, w: item.w, h: item.h }
      if (!hasCollision(layoutRef.current, visibleRef.current, drag.id, candidate, colsRef.current)) {
        ghostRef.current = candidate
        setGhost(candidate)
      } else {
        let found = false
        outer: for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const alt = {
              x: Math.max(0, Math.min(colsRef.current - item.w, snappedX + dx)),
              y: Math.max(0, snappedY + dy),
              w: item.w,
              h: item.h,
            }
            if (!hasCollision(layoutRef.current, visibleRef.current, drag.id, alt, colsRef.current)) {
              ghostRef.current = alt
              setGhost(alt)
              found = true
              break outer
            }
          }
        }
        if (!found) {
          ghostRef.current = null
          setGhost(null)
        }
      }
    }

    if (resize) {
      const item = layoutRef.current[resize.id]
      const dx = e.clientX - resize.startPX
      const dy = e.clientY - resize.startPY
      const newW = Math.max(1, Math.min(colsRef.current - item.x, Math.round(resize.startW + dx / (CELL_SIZE + GRID_GAP))))
      const newH = Math.max(1, Math.min(5, Math.round(resize.startH + dy / (CELL_SIZE + GRID_GAP))))
      const candidate = { x: item.x, y: item.y, w: newW, h: newH }
      if (!hasCollision(layoutRef.current, visibleRef.current, resize.id, candidate, colsRef.current)) {
        const newLayout = { ...layoutRef.current, [resize.id]: candidate }
        setLayout(newLayout)
        layoutRef.current = newLayout
        saveLayout(newLayout)
      }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    const drag = draggingRef.current
    const g = ghostRef.current
    const resize = resizingRef.current

    if (drag && g) {
      const item = layoutRef.current[drag.id]
      if (!hasCollision(layoutRef.current, visibleRef.current, drag.id, g, colsRef.current)) {
        const newLayout = {
          ...layoutRef.current,
          [drag.id]: { x: g.x, y: g.y, w: item.w, h: item.h },
        }
        setLayout(newLayout)
        layoutRef.current = newLayout
        saveLayout(newLayout)
      }
    }
    if (resize) {
      saveLayout(layoutRef.current)
    }

    draggingRef.current = null
    resizingRef.current = null
    ghostRef.current = null
    setDragging(null)
    setResizing(null)
    setGhost(null)
    setLifted(null)
  }, [])

  function renderWidget(id: WidgetId, shellProps: ShellProps, nav: (page: string) => void) {
    switch (id) {
      case "net":     return <NetWorthWidget {...shellProps} />
      case "assets":  return <AssetsWidget {...shellProps} />
      case "debt":    return <DebtWidget {...shellProps} />
      case "budget":  return <BudgetWidget {...shellProps} />
      case "tasks":   return <TopTasksWidget {...shellProps} onNavigate={nav} />
      case "focus":   return <FocusWidget {...shellProps} onNavigate={nav} />
      case "habits":  return <HabitsWidget {...shellProps} />
      case "ai":      return <AIWidget {...shellProps} onNavigate={nav} />
      case "weather": return <WeatherWidget {...shellProps} />
      case "health":  return <HealthWidget {...shellProps} />
      case "notes":            return <NotesWidget {...shellProps} onNavigate={nav} />
      case "finance_overview": return <FinanceOverviewWidget {...shellProps} />
      case "upcoming":         return <UpcomingWidget {...shellProps} />
      case "streak":           return <StreakWidget {...shellProps} />
      case "quick_note":       return <QuickNoteWidget {...shellProps} />
      case "ai_insight":       return <AIInsightWidget {...shellProps} />
      case "nutrition":        return <NutritionWidget {...shellProps} onNavigate={nav} />
      default: {
        const meta = ALL_WIDGETS.find((w) => w.id === id)!
        return (
          <WidgetShell title={meta.label} color={meta.color} glyph={meta.glyph} {...shellProps}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--ink-faint)",
              }}
            >
              <Icon name={meta.glyph as IconName} size={24} />
            </div>
          </WidgetShell>
        )
      }
    }
  }

  const displayWidgets = isMobile ? MOBILE_WIDGETS : visible

  if (isMobile) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: GRID_GAP,
          padding: 16,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {displayWidgets.map((id) => {
          const shellProps: ShellProps = {
            onRemove: () => {
              const next = visible.filter((v) => v !== id)
              setVisible(next)
              saveVisibleWidgets(next)
            },
          }
          return (
            <div key={id} style={{ position: "relative", minHeight: 160 }}>
              {renderWidget(id, shellProps, onNavigate)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Scroll container */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* Outer wrapper — measured by ResizeObserver, pointer capture, horizontal scroll */}
        <div
          ref={outerRef}
          style={{ width: "100%", overflowX: "auto" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* CSS grid — fixed 160px cells, fit-content width, centered */}
          <div
            ref={gridRef}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
              gridAutoRows: `${CELL_SIZE}px`,
              gap: GRID_GAP,
              padding: GRID_PADDING,
              width: "fit-content",
              margin: "0 auto",
              position: "relative",
            }}
          >
            {/* Ghost drop target */}
            {ghost && (
              <div
                className="grid-ghost"
                style={{
                  gridColumn: `${ghost.x + 1} / span ${ghost.w}`,
                  gridRow: `${ghost.y + 1} / span ${ghost.h}`,
                  background: "var(--edge-soft)",
                  borderRadius: "var(--radius)",
                  border: "1.5px dashed var(--edge-strong)",
                  zIndex: 0,
                }}
              />
            )}

            {/* Widget items */}
            {displayWidgets.map((id) => {
              const item = layout[id]
              const isDragging = dragging?.id === id
              const isResizing = resizing?.id === id

              const shellProps: ShellProps = {
                dragging: isDragging,
                lifted: lifted === id,
                onHandleDown: (e) => handleDragStart(e, id),
                onResizeDown: (e) => handleResizeStart(e, id),
                onRemove: () => {
                  const next = visible.filter((v) => v !== id)
                  setVisible(next)
                  saveVisibleWidgets(next)
                },
              }

              return (
                <div
                  key={id}
                  style={{
                    gridColumn: `${item.x + 1} / span ${item.w}`,
                    gridRow: `${item.y + 1} / span ${item.h}`,
                    zIndex: isDragging ? 20 : 1,
                    transition: isDragging ? "none" : "grid-column .15s, grid-row .15s",
                    position: "relative",
                  }}
                >
                  {renderWidget(id, shellProps, onNavigate)}
                  {(isDragging || isResizing) && (
                    <div className="size-badge">{item.w}×{item.h}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Widget button */}
      <div style={{ display: "flex", justifyContent: "center", padding: "16px 20px 24px" }}>
        <button className="btn" onClick={() => setShowAddWidget(true)} style={{ gap: 8 }}>
          <span style={{ display: "flex" }}><Icon name="plus" size={14} /></span>
          {L("Adicionar Widget", "Add Widget")}
        </button>
      </div>

      <AddWidgetModal
        open={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        visible={visible}
        onToggle={(id) => {
          if (visible.includes(id)) {
            const newVisible = visible.filter(v => v !== id)
            setVisible(newVisible)
            saveVisibleWidgets(newVisible)
          } else {
            const defaultSize = DEFAULT_LAYOUT[id]
            const pos = findFreePosition(layout, visible, defaultSize.w, defaultSize.h, cols)
            const newLayout = { ...layout, [id]: { ...defaultSize, ...pos } }
            setLayout(newLayout)
            layoutRef.current = newLayout
            saveLayout(newLayout)
            const newVisible = [...visible, id]
            setVisible(newVisible)
            saveVisibleWidgets(newVisible)
          }
        }}
      />
    </div>
  )
}

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
import AddWidgetModal from "./AddWidgetModal"
import {
  getLayout,
  saveLayout,
  getVisibleWidgets,
  saveVisibleWidgets,
  ALL_WIDGETS,
  DEFAULT_LAYOUT,
  type WidgetId,
  type Layout,
} from "@/lib/dashboard"
import type { IconName } from "@/lib/icons"
import { L } from "@/lib/i18n"

const GRID_COLS = 5
const GRID_GAP = 16
const GRID_PADDING = 20

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
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

const MOBILE_WIDGETS: WidgetId[] = ['net', 'focus', 'tasks', 'habits', 'notes', 'ai']

export default function DashboardGrid({ onNavigate }: { onNavigate: (id: string) => void }) {
  const isMobile = useIsMobile()
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [visible, setVisible] = useState<WidgetId[]>([])
  const [dragging, setDragging] = useState<DragState>(null)
  const [resizing, setResizing] = useState<ResizeState>(null)
  const [ghost, setGhost] = useState<GhostState>(null)
  const [lifted, setLifted] = useState<WidgetId | null>(null)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [cellSize, setCellSize] = useState(118)

  const gridRef = useRef<HTMLDivElement>(null)
  const cellSizeRef = useRef(118)

  // Refs for stale-closure-safe pointer handlers
  const draggingRef = useRef<DragState>(null)
  const resizingRef = useRef<ResizeState>(null)
  const ghostRef = useRef<GhostState>(null)
  const layoutRef = useRef<Layout>(DEFAULT_LAYOUT)

  useEffect(() => {
    const l = getLayout()
    const v = getVisibleWidgets()
    layoutRef.current = l
    setLayout(l)
    setVisible(v)
  }, [])

  useEffect(() => { cellSizeRef.current = cellSize }, [cellSize])

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const cs = Math.floor((w - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS)
      setCellSize(cs)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function getColWidth(): number {
    if (!gridRef.current) return 100
    const rect = gridRef.current.getBoundingClientRect()
    return (rect.width - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
  }

  function handleDragStart(e: React.PointerEvent, id: WidgetId) {
    e.preventDefault()
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const colW = getColWidth()
    const rowH = cellSizeRef.current + GRID_GAP
    const item = layoutRef.current[id]
    const widgetLeft = rect.left + GRID_PADDING + item.x * (colW + GRID_GAP)
    const widgetTop = rect.top + GRID_PADDING + item.y * rowH
    const ox = e.clientX - widgetLeft
    const oy = e.clientY - widgetTop
    const state: DragState = { id, ox, oy }
    draggingRef.current = state
    setDragging(state)
    setLifted(id)
    const g: GhostState = { x: item.x, y: item.y, w: item.w, h: item.h }
    ghostRef.current = g
    setGhost(g)
    gridRef.current.setPointerCapture(e.pointerId)
  }

  function handleResizeStart(e: React.PointerEvent, id: WidgetId) {
    e.preventDefault()
    e.stopPropagation()
    if (!gridRef.current) return
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
    gridRef.current.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = draggingRef.current
    const resize = resizingRef.current

    if (drag) {
      if (!gridRef.current) return
      const rect = gridRef.current.getBoundingClientRect()
      const colW = (rect.width - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
      const rowH = cellSizeRef.current + GRID_GAP
      const item = layoutRef.current[drag.id]
      const gx = Math.round((e.clientX - rect.left - GRID_PADDING - drag.ox) / (colW + GRID_GAP))
      const gy = Math.round((e.clientY - rect.top - GRID_PADDING - drag.oy) / rowH)
      const clampedX = Math.max(0, Math.min(GRID_COLS - item.w, gx))
      const clampedY = Math.max(0, gy)
      const g: GhostState = { x: clampedX, y: clampedY, w: item.w, h: item.h }
      ghostRef.current = g
      setGhost(g)
    }

    if (resize) {
      const colW = getColWidth()
      const dx = e.clientX - resize.startPX
      const dy = e.clientY - resize.startPY
      const item = layoutRef.current[resize.id]
      const newW = Math.max(1, Math.min(GRID_COLS - item.x, Math.round(resize.startW + dx / (colW + GRID_GAP))))
      const newH = Math.max(1, Math.min(5, Math.round(resize.startH + dy / (cellSizeRef.current + GRID_GAP))))
      if (newW !== item.w || newH !== item.h) {
        const newLayout = {
          ...layoutRef.current,
          [resize.id]: { ...layoutRef.current[resize.id], w: newW, h: newH },
        }
        layoutRef.current = newLayout
        setLayout(newLayout)
      }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    const drag = draggingRef.current
    const g = ghostRef.current
    const resize = resizingRef.current

    if (drag && g) {
      const newLayout = {
        ...layoutRef.current,
        [drag.id]: { ...layoutRef.current[drag.id], x: g.x, y: g.y },
      }
      layoutRef.current = newLayout
      setLayout(newLayout)
      saveLayout(newLayout)
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
      case "notes":   return <NotesWidget {...shellProps} onNavigate={nav} />
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

  const active = dragging !== null || resizing !== null
  const displayWidgets = isMobile ? MOBILE_WIDGETS : visible

  if (isMobile) {
    return (
      <div
        ref={gridRef}
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
            <div key={id} style={{ position: "relative" }}>
              {renderWidget(id, shellProps, onNavigate)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Scroll container — gridRef measures its full width for cell-size calculation */}
      <div
        ref={gridRef}
        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridAutoRows: `${cellSize}px`,
            gap: GRID_GAP,
            padding: GRID_PADDING,
            position: "relative",
          }}
        >
          {/* Grid guides — shown during drag/resize */}
          {active && Array.from({ length: GRID_COLS * 5 }, (_, i) => {
            const col = (i % GRID_COLS) + 1
            const row = Math.floor(i / GRID_COLS) + 1
            return (
              <div
                key={`guide-${i}`}
                className="grid-guide"
                style={{ gridColumn: col, gridRow: row, zIndex: 0, pointerEvents: "none" }}
              />
            )
          })}

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
            const showBadge = isDragging || isResizing

            const shellProps: ShellProps = {
              dragging: isDragging,
              lifted: lifted === id,
              sizeBadge: showBadge ? `${item.w}×${item.h}` : undefined,
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
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Widget button — below the scrollable grid */}
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
          const newVisible = visible.includes(id)
            ? visible.filter(v => v !== id)
            : [...visible, id]
          setVisible(newVisible)
          saveVisibleWidgets(newVisible)
        }}
      />
    </div>
  )
}

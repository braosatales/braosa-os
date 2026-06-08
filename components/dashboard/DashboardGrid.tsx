"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Icon } from "@/components/ui"
import WidgetShell from "./WidgetShell"
import NetWorthWidget from "./widgets/NetWorthWidget"
import AssetsWidget from "./widgets/AssetsWidget"
import DebtWidget from "./widgets/DebtWidget"
import BudgetWidget from "./widgets/BudgetWidget"
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
import { useTweaksPanel } from "@/components/tweaks/TweaksPanel"
import type { IconName } from "@/lib/icons"

const GRID_COLS = 5
const GRID_ROW_H = 118
const GRID_GAP = 16

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

export default function DashboardGrid({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [visible, setVisible] = useState<WidgetId[]>([])
  const [dragging, setDragging] = useState<DragState>(null)
  const [resizing, setResizing] = useState<ResizeState>(null)
  const [ghost, setGhost] = useState<GhostState>(null)
  const [lifted, setLifted] = useState<WidgetId | null>(null)
  const [showAddPopover, setShowAddPopover] = useState(false)
  const [addPopoverPos, setAddPopoverPos] = useState<{ top: number; left: number } | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)

  // Refs for stale-closure-safe pointer handlers
  const draggingRef = useRef<DragState>(null)
  const resizingRef = useRef<ResizeState>(null)
  const ghostRef = useRef<GhostState>(null)
  const layoutRef = useRef<Layout>(DEFAULT_LAYOUT)

  const { previewDrag } = useTweaksPanel()

  useEffect(() => {
    const l = getLayout()
    const v = getVisibleWidgets()
    layoutRef.current = l
    setLayout(l)
    setVisible(v)
  }, [])

  function getColWidth(): number {
    if (!gridRef.current) return 100
    const rect = gridRef.current.getBoundingClientRect()
    return (rect.width - 40 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
  }

  function handleDragStart(e: React.PointerEvent, id: WidgetId) {
    e.preventDefault()
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const colW = getColWidth()
    const rowH = GRID_ROW_H + GRID_GAP
    const item = layoutRef.current[id]
    const widgetLeft = rect.left + 20 + item.x * (colW + GRID_GAP)
    const widgetTop = rect.top + 20 + item.y * rowH
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
      const colW = (rect.width - 40 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
      const rowH = GRID_ROW_H + GRID_GAP
      const item = layoutRef.current[drag.id]
      const gx = Math.round((e.clientX - rect.left - 20 - drag.ox) / (colW + GRID_GAP))
      const gy = Math.round((e.clientY - rect.top - 20 - drag.oy) / rowH)
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
      const newH = Math.max(1, Math.min(5, Math.round(resize.startH + dy / (GRID_ROW_H + GRID_GAP))))
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

  function getNextAvailableCell(): { x: number; y: number } {
    const occupied = new Set<string>()
    for (const id of visible) {
      const item = layout[id]
      for (let r = item.y; r < item.y + item.h; r++) {
        for (let c = item.x; c < item.x + item.w; c++) {
          occupied.add(`${c},${r}`)
        }
      }
    }
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (!occupied.has(`${c},${r}`)) return { x: c, y: r }
      }
    }
    return { x: 0, y: 12 }
  }

  function renderWidget(id: WidgetId, shellProps: ShellProps) {
    switch (id) {
      case "net":    return <NetWorthWidget {...shellProps} />
      case "assets": return <AssetsWidget {...shellProps} />
      case "debt":   return <DebtWidget {...shellProps} />
      case "budget": return <BudgetWidget {...shellProps} />
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

  const addPos = getNextAvailableCell()
  const hidden = ALL_WIDGETS.filter((w) => !visible.includes(w.id))
  const active = dragging !== null || resizing !== null

  return (
    <div
      ref={gridRef}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gap: GRID_GAP,
        padding: 20,
        overflowY: "auto",
        flex: 1,
        minHeight: 0,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Grid guides — shown during drag/resize */}
      {active &&
        Array.from({ length: GRID_COLS * 5 }, (_, i) => {
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
      {visible.map((id) => {
        const item = layout[id]
        const isDragging = dragging?.id === id
        const isResizing = resizing?.id === id
        const showBadge = isDragging || isResizing

        const shellProps: ShellProps = {
          dragging: isDragging,
          lifted: previewDrag && lifted === id,
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
              minHeight: item.h * GRID_ROW_H + (item.h - 1) * GRID_GAP,
              transition: isDragging ? "none" : "grid-column .15s, grid-row .15s",
              position: "relative",
            }}
          >
            {renderWidget(id, shellProps)}
          </div>
        )
      })}

      {/* Add widget button */}
      {hidden.length > 0 && (
        <div
          style={{
            gridColumn: `${addPos.x + 1} / span 1`,
            gridRow: `${addPos.y + 1} / span 1`,
            minHeight: GRID_ROW_H,
            background: "transparent",
            border: "1.5px dashed var(--edge)",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 1,
            position: "relative",
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setAddPopoverPos({ top: rect.bottom + 4, left: rect.left })
            setShowAddPopover(true)
          }}
        >
          <span style={{ color: "var(--ink-faint)" }}>
            <Icon name="plus" size={20} />
          </span>
        </div>
      )}

      {/* Add widget popover — fixed to avoid grid clipping */}
      {showAddPopover && addPopoverPos && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 299 }}
            onClick={() => setShowAddPopover(false)}
          />
          <div
            style={{
              position: "fixed",
              top: addPopoverPos.top,
              left: addPopoverPos.left,
              background: "var(--bg-raised-2)",
              border: "1px solid var(--edge)",
              borderRadius: "var(--radius-sm)",
              padding: 8,
              zIndex: 300,
              minWidth: 200,
              boxShadow: "var(--shadow-pop)",
            }}
          >
            {hidden.map((w) => (
              <div
                key={w.id}
                className="addw-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  const next = [...visible, w.id]
                  setVisible(next)
                  saveVisibleWidgets(next)
                  setShowAddPopover(false)
                }}
              >
                <span style={{ color: w.color, opacity: 0.8, display: "flex" }}>
                  <Icon name={w.glyph as any} size={14} />
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{w.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

"use client"

import { Icon } from "@/components/ui"
import type { IconName } from "@/lib/icons"
import { useIsMobile } from "@/lib/hooks/useIsMobile"

type Props = {
  title: string
  color?: string
  glyph: string
  synced?: string
  sizeBadge?: string
  children: React.ReactNode
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

export default function WidgetShell({
  title,
  color = "var(--c-fin)",
  glyph,
  synced,
  sizeBadge,
  children,
  dragging,
  lifted,
  onHandleDown,
  onResizeDown,
  onRemove,
}: Props) {
  const isMobile = useIsMobile()
  const accent = color

  let boxShadow = "var(--shadow-card)"
  if (lifted) {
    boxShadow = `0 0 0 2px var(--accent), var(--shadow-pop)`
  } else if (dragging) {
    boxShadow = "var(--shadow-pop)"
  }

  return (
    <div
      className="widget"
      style={{
        "--accent": accent,
        position: "relative",
        background: "linear-gradient(180deg, var(--bg-raised), oklch(0.205 0.007 70))",
        border: "1px solid var(--edge)",
        borderRadius: "var(--radius)",
        boxShadow,
        padding: "16px 17px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow .18s",
        transform: dragging ? "scale(1.02)" : "none",
        opacity: dragging ? 0.9 : 1,
        zIndex: dragging ? 20 : undefined,
      } as React.CSSProperties}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2.5,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
          pointerEvents: "none",
        }}
      />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ color: "var(--accent)", opacity: 0.7, display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Icon name={glyph as IconName} size={14} />
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--ink-soft)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {synced && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--ink-faint)",
              flexShrink: 0,
            }}
          >
            {synced}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button className="widget-x" onClick={onRemove} title="Remove widget">
          ×
        </button>
      )}

      {/* Drag handle */}
      {!isMobile && (
        <div
          className="drag-handle"
          onPointerDown={onHandleDown}
        >
          <Icon name="drag" size={13} />
        </div>
      )}

      {/* Resize grip */}
      {!isMobile && (
        <div
          className="resize-grip"
          style={{ color: "var(--ink-faint)" }}
          onPointerDown={(e) => onResizeDown?.(e, "se")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="13" y1="1"  x2="1"  y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="13" y1="5"  x2="5"  y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="13" y1="9"  x2="9"  y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Size badge (shown during drag/resize) */}
      {sizeBadge && <div className="size-badge">{sizeBadge}</div>}
    </div>
  )
}

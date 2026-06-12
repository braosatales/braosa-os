"use client"

import { useState, useRef } from "react"
import { Modal, Icon } from "@/components/ui"
import { ALL_WIDGETS, type WidgetId } from "@/lib/dashboard"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import { L } from "@/lib/i18n"

type Props = {
  open: boolean
  onClose: () => void
  visible: WidgetId[]
  onToggle: (id: WidgetId) => void
  onReorder?: (newOrder: WidgetId[]) => void
}

export default function AddWidgetModal({ open, onClose, visible, onToggle, onReorder }: Props) {
  const isMobile = useIsMobile()
  const activeWidgets = ALL_WIDGETS.filter(w => visible.includes(w.id))
  const availableWidgets = ALL_WIDGETS.filter(w => !visible.includes(w.id))

  return (
    <Modal open={open} onClose={onClose} width={600}>
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--edge)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            {L("Widgets", "Widgets")}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 3 }}>
            {availableWidgets.length === 0
              ? L(`${activeWidgets.length} widgets ativos`, `${activeWidgets.length} widgets active`)
              : L(
                  `${activeWidgets.length} ativos · ${availableWidgets.length} disponíveis`,
                  `${activeWidgets.length} active · ${availableWidgets.length} available`,
                )
            }
          </div>
        </div>
        <button
          className="btn"
          onClick={onClose}
          style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ padding: "20px 24px", maxHeight: "80vh", overflowY: "auto" }}>
        {/* Active section */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          {L("ATIVOS", "ACTIVE")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {activeWidgets.map(w => (
            <WidgetCard
              key={w.id}
              widget={w}
              active
              onAction={() => onToggle(w.id)}
            />
          ))}
          {activeWidgets.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "20px 0",
                textAlign: "center",
                color: "var(--ink-faint)",
                fontSize: 12,
              }}
            >
              {L("Nenhum widget ativo", "No active widgets")}
            </div>
          )}
        </div>

        {/* Available section */}
        <>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginBottom: 10,
              marginTop: 20,
              textTransform: "uppercase",
            }}
          >
            {L("DISPONÍVEIS", "AVAILABLE")}
          </div>
          {availableWidgets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-faint)', fontSize: 13 }}>
              All widgets are active
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {availableWidgets.map(w => (
                <WidgetCard
                  key={w.id}
                  widget={w}
                  active={false}
                  onAction={() => onToggle(w.id)}
                />
              ))}
            </div>
          )}
        </>

        {/* ORDER section — mobile only */}
        {isMobile && activeWidgets.length > 0 && onReorder && (
          <>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--ink-faint)',
                letterSpacing: '0.16em',
                marginBottom: 10,
                marginTop: 20,
                textTransform: 'uppercase',
              }}
            >
              ORDER
            </div>
            <ReorderList
              visible={visible}
              onReorder={onReorder}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

type WidgetCardProps = {
  widget: typeof ALL_WIDGETS[0]
  active: boolean
  onAction: () => void
}

function WidgetCard({ widget: w, active, onAction }: WidgetCardProps) {
  const [btnHovered, setBtnHovered] = useState(false)

  return (
    <div
      style={{
        background: active ? "var(--bg-raised)" : "var(--bg-inset)",
        border: `1px solid ${active ? "var(--edge)" : "var(--edge-soft)"}`,
        borderRadius: "var(--radius)",
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "opacity .18s",
      }}
    >
      {/* Colored top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${w.color}, transparent)`,
          pointerEvents: "none",
        }}
      />

      {/* Top row: icon box + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `color-mix(in oklch, ${w.color} 18%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: w.color, display: "flex" }}>
            <Icon name={w.glyph as any} size={15} />
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.2,
          }}
        >
          {w.label}
        </span>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-faint)",
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {w.description}
      </div>

      {/* Action button */}
      <div>
        <button
          className="btn"
          onClick={onAction}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            fontSize: 11,
            padding: "4px 10px",
            color: btnHovered
              ? active ? "var(--neg)" : w.color
              : undefined,
            transition: "color .15s",
          }}
        >
          {active ? L("Remover", "Remove") : L("+ Adicionar", "+ Add")}
        </button>
      </div>
    </div>
  )
}

type ReorderListProps = {
  visible: WidgetId[]
  onReorder: (newOrder: WidgetId[]) => void
}

function ReorderList({ visible, onReorder }: ReorderListProps) {
  const dragIndex = useRef<number | null>(null)
  const [order, setOrder] = useState<WidgetId[]>(visible)

  function handlePointerDown(i: number) {
    dragIndex.current = i
  }

  function handlePointerUp(i: number) {
    if (dragIndex.current === null || dragIndex.current === i) {
      dragIndex.current = null
      return
    }
    const from = dragIndex.current
    const to = i
    dragIndex.current = null
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setOrder(next)
    onReorder(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {order.map((id, i) => {
        const meta = ALL_WIDGETS.find(w => w.id === id)
        if (!meta) return null
        return (
          <div
            key={id}
            onPointerDown={() => handlePointerDown(i)}
            onPointerUp={() => handlePointerUp(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge-soft)',
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <span style={{ color: 'var(--ink-faint)', fontSize: 16, lineHeight: 1 }}>⠿</span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: `color-mix(in oklch, ${meta.color} 18%, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: meta.color, display: 'flex' }}>
                <Icon name={meta.glyph as any} size={13} />
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{meta.label}</span>
          </div>
        )
      })}
    </div>
  )
}

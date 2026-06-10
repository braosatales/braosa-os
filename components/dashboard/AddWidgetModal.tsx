"use client"

import { useState } from "react"
import { Modal, Icon } from "@/components/ui"
import { ALL_WIDGETS, type WidgetId } from "@/lib/dashboard"
import { L } from "@/lib/i18n"

type Props = {
  open: boolean
  onClose: () => void
  visible: WidgetId[]
  onToggle: (id: WidgetId) => void
}

export default function AddWidgetModal({ open, onClose, visible, onToggle }: Props) {
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
            {L(
              `${activeWidgets.length} ativos · ${availableWidgets.length} disponíveis`,
              `${activeWidgets.length} active · ${availableWidgets.length} available`,
            )}
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
        {availableWidgets.length > 0 && (
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

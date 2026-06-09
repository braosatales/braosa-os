"use client"

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
  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--edge-soft)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
            {L("Widgets", "Widgets")}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 4 }}>
            {L("Escolhe os widgets para o teu dashboard", "Choose widgets for your dashboard")}
          </div>
        </div>

        <div style={{ maxHeight: 380, overflowY: "auto", padding: 12 }}>
          {ALL_WIDGETS.map((w) => {
            const isVisible = visible.includes(w.id)
            return (
              <div
                key={w.id}
                className="addw-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
                onClick={() => onToggle(w.id)}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: `color-mix(in oklch, ${w.color} 14%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ color: w.color }}>
                    <Icon name={w.glyph as any} size={18} />
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
                    {w.label}
                  </div>
                  <div style={{ fontSize: 11, color: isVisible ? "var(--pos)" : "var(--ink-faint)" }}>
                    {L(isVisible ? "Visível" : "Oculto", isVisible ? "Visible" : "Hidden")}
                  </div>
                </div>

                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "background .18s",
                    position: "relative",
                    flexShrink: 0,
                    background: isVisible ? "var(--c-task)" : "var(--bg-inset)",
                  }}
                  onClick={(e) => { e.stopPropagation(); onToggle(w.id) }}
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    position: "absolute",
                    top: 2,
                    background: "white",
                    borderRadius: 99,
                    transition: "transform .18s",
                    transform: isVisible ? "translateX(16px)" : "translateX(2px)",
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--edge-soft)" }}>
          <button
            style={{
              width: "100%",
              background: "var(--c-task-dim)",
              border: "1px solid var(--c-task)",
              color: "var(--c-task)",
              borderRadius: "var(--radius-sm)",
              padding: "10px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            {L("Feito", "Done")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

"use client"

import { useState, useMemo } from "react"
import WidgetShell from "../WidgetShell"
import { Icon } from "@/components/ui"
import { L, getLang } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

type Props = ShellProps & { onNavigate: (id: string) => void }

export default function AIWidget({ onNavigate, ...shellProps }: Props) {
  const [input, setInput] = useState("")

  const suggestion = useMemo(() => {
    return getLang() === "en"
      ? "What do you need to get done today? I can help prioritize."
      : "O que precisas de fazer hoje? Posso ajudar a priorizar."
  }, [])

  function handleSend() {
    if (!input.trim()) return
    setInput("")
    onNavigate("ai")
  }

  return (
    <WidgetShell title={L("Assistente IA", "AI Assistant")} color="var(--c-ai)" glyph="wand" {...shellProps}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--c-task-dim)",
              border: "1px solid var(--edge)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="wand" size={14} />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5 }}>
            {suggestion}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="glow-focus"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
            placeholder={L("Pergunta algo…", "Ask something…")}
            style={{
              "--accent": "var(--c-ai)",
              flex: 1,
              background: "var(--bg-inset)",
              border: "1px solid var(--edge)",
              borderRadius: "var(--radius-sm)",
              padding: "9px 12px",
              fontSize: 13,
              color: "var(--ink)",
            } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={handleSend}
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-sm)",
              background: "var(--c-task-dim)",
              border: "1px solid var(--edge)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--c-ai)",
              flexShrink: 0,
              padding: 0,
            }}
          >
            <Icon name="send" size={13} />
          </button>
        </div>
      </div>
    </WidgetShell>
  )
}

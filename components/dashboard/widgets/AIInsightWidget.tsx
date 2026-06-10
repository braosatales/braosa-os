"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Icon } from "@/components/ui"
import { L } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

export default function AIInsightWidget(props: ShellProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchInsight(force = false) {
    setLoading(true)
    try {
      const url = force ? "/api/ai/insight?force=true" : "/api/ai/insight"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setInsight((data.insight as string) ?? null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsight()
  }, [])

  return (
    <WidgetShell title={L("Insight AI", "AI Insight")} color="var(--c-task)" glyph="wand" {...props}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-faint)", fontSize: 12 }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--c-task)",
                  display: "inline-block",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        ) : insight ? (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {insight}
          </p>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            {L("Sem insight disponível", "No insight available")}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--ink-faint)",
            }}
          >
            {L("hoje", "today")}
          </span>
          <button
            className="btn"
            onClick={() => fetchInsight(true)}
            disabled={loading}
            style={{ fontSize: 11, padding: "3px 8px", opacity: loading ? 0.5 : 1 }}
            title={L("Atualizar insight", "Refresh insight")}
          >
            <Icon name="refresh" size={11} />
          </button>
        </div>
      </div>
    </WidgetShell>
  )
}

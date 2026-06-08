"use client"

import WidgetShell from "../WidgetShell"
import { Icon } from "@/components/ui"
import { L } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

export default function WeatherWidget(shellProps: ShellProps) {
  return (
    <WidgetShell title={L("Tempo", "Weather")} color="var(--c-dash)" glyph="cloud" {...shellProps}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 6,
        }}
      >
        <Icon name="cloud" size={46} stroke={1.4} />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 34,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          --°
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
          {L("A carregar tempo…", "Loading weather…")}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
          {L("API de tempo em breve", "Weather API coming soon")}
        </span>
      </div>
    </WidgetShell>
  )
}

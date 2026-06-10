"use client"

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

export default function UpcomingWidget(props: ShellProps) {
  return (
    <WidgetShell title={L("Próximos Eventos", "Upcoming Events")} color="var(--c-cal)" glyph="calendar" {...props}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 8,
          color: "var(--ink-faint)",
        }}
      >
        <span style={{ color: "var(--c-cal)", opacity: 0.5 }}>
          <Icon name="calendar" size={28} />
        </span>
        <span style={{ fontSize: 12 }}>
          {L("Calendário em breve", "Calendar coming soon")}
        </span>
      </div>
    </WidgetShell>
  )
}

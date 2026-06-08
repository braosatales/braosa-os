"use client"

import WidgetShell from "../WidgetShell"
import { EmptyState } from "@/components/ui"
import { fmt } from "@/lib/fmt"
import { useFinanceSummary } from "@/lib/finance-summary"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

function Skeleton() {
  const bar = (w: string, delay: string) => (
    <div
      style={{
        height: 12,
        width: w,
        background: "var(--bg-raised-2)",
        borderRadius: 4,
        animation: `skeleton-pulse 1.2s ease-in-out ${delay} infinite alternate`,
      }}
    />
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bar("55%", "0s")}
      {bar("35%", "0.2s")}
    </div>
  )
}

export default function AssetsWidget(props: ShellProps) {
  const { data, loading } = useFinanceSummary()

  return (
    <WidgetShell title="Assets" color="var(--c-fin)" glyph="wallet" {...props}>
      {loading ? (
        <Skeleton />
      ) : !data ? (
        <EmptyState icon="wallet" title="No accounts" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              fontWeight: 600,
              color: "var(--ink)",
              lineHeight: 1.15,
            }}
          >
            {fmt.eurk(data.totalCash)}
          </div>
          <div style={{ color: "var(--ink-dim)", fontSize: 11.5, marginTop: 2 }}>
            cash
          </div>
          <div
            style={{
              height: 1,
              background: "var(--edge-soft)",
              margin: "8px 0",
            }}
          />
          <div style={{ color: "var(--ink-faint)", fontSize: 11.5 }}>
            {fmt.eurk(data.totalInvest)} invested
          </div>
        </div>
      )}
    </WidgetShell>
  )
}

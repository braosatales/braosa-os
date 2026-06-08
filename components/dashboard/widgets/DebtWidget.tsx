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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          height: 12,
          width: "55%",
          background: "var(--bg-raised-2)",
          borderRadius: 4,
          animation: "skeleton-pulse 1.2s ease-in-out 0s infinite alternate",
        }}
      />
      <div
        style={{
          height: 12,
          width: "35%",
          background: "var(--bg-raised-2)",
          borderRadius: 4,
          animation: "skeleton-pulse 1.2s ease-in-out 0.2s infinite alternate",
        }}
      />
    </div>
  )
}

export default function DebtWidget(props: ShellProps) {
  const { data, loading } = useFinanceSummary()

  return (
    <WidgetShell title="Debt" color="var(--neg)" glyph="trending-down" {...props}>
      {loading ? (
        <Skeleton />
      ) : !data ? (
        <EmptyState icon="trending-down" title="No data" />
      ) : data.totalDebt === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 4,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pos)" }}>
            Debt-free
          </div>
          <div style={{ fontSize: 20 }}>🎉</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              fontWeight: 600,
              color: "var(--neg)",
              lineHeight: 1.15,
            }}
          >
            {fmt.eurk(data.totalDebt)}
          </div>
          <div style={{ color: "var(--ink-dim)", fontSize: 11.5, marginTop: 2 }}>
            total debt
          </div>
        </div>
      )}
    </WidgetShell>
  )
}

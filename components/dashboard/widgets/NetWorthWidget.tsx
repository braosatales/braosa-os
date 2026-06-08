"use client"

import WidgetShell from "../WidgetShell"
import { Sparkline, EmptyState } from "@/components/ui"
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

function seedSparkline(seed: number, n = 10): number[] {
  const pts: number[] = [seed]
  let s = seed
  for (let i = 1; i < n; i++) {
    s = ((s * 1103515245 + 12345) & 0x7fffffff)
    pts.push(seed * (1 + (s % 100 - 50) / 2500))
  }
  return pts
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
      {bar("60%", "0s")}
      {bar("40%", "0.2s")}
      {bar("80%", "0.4s")}
    </div>
  )
}

export default function NetWorthWidget(props: ShellProps) {
  const { data, loading } = useFinanceSummary()

  return (
    <WidgetShell title="Net Worth" color="var(--c-fin)" glyph="trending-up" {...props}>
      {loading ? (
        <Skeleton />
      ) : !data ? (
        <EmptyState
          icon="trending-up"
          title="No accounts"
          subtitle="Connect finance accounts to see your net worth"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              lineHeight: 1.1,
            }}
          >
            {fmt.eurk(data.netWorth)}
          </div>
          <div style={{ color: "var(--ink-dim)", fontSize: 12 }}>
            {fmt.eurk(data.totalAssets)} in assets
          </div>
          <div style={{ marginTop: 8, overflow: "hidden" }}>
            <Sparkline
              data={seedSparkline(Math.abs(data.netWorth))}
              w={440}
              h={58}
              color="var(--c-fin)"
            />
          </div>
        </div>
      )}
    </WidgetShell>
  )
}

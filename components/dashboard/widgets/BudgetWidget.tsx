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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {bar("70%", "0s")}
      {bar("50%", "0.2s")}
      {bar("80%", "0.4s")}
    </div>
  )
}

export default function BudgetWidget(props: ShellProps) {
  const { data, loading } = useFinanceSummary()

  if (loading) {
    return (
      <WidgetShell title="Budget" color="var(--c-fin)" glyph="chart-bar" {...props}>
        <Skeleton />
      </WidgetShell>
    )
  }

  if (!data) {
    return (
      <WidgetShell title="Budget" color="var(--c-fin)" glyph="chart-bar" {...props}>
        <EmptyState icon="chart-bar" title="No budgets" />
      </WidgetShell>
    )
  }

  const overBudget = data.budgets.filter((b) => b.spent > b.limit)

  return (
    <WidgetShell title="Budget" color="var(--c-fin)" glyph="chart-bar" {...props}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {overBudget.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-dim)",
              fontSize: 13,
            }}
          >
            All budgets on track ✓
          </div>
        ) : (
          <>
            <div
              style={{
                flex: 1,
                overflowY: overBudget.length > 3 ? "auto" : undefined,
              }}
            >
              {overBudget.map((b) => (
                <div key={b.cat}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>
                      {b.cat}
                    </span>
                    <span
                      className="tnum"
                      style={{ color: "var(--ink-dim)", fontSize: 12 }}
                    >
                      €{b.spent} / €{b.limit}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 99,
                      background: "var(--bg-inset)",
                      overflow: "hidden",
                      marginTop: 4,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${(Math.min(b.spent / b.limit, 1.8) / 1.8) * 100}%`,
                        height: "100%",
                        borderRadius: "inherit",
                        background: "linear-gradient(90deg, var(--c-fin), var(--neg))",
                        boxShadow: "0 0 8px var(--neg)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-faint)",
                marginTop: 8,
              }}
            >
              {overBudget.length} over · {fmt.eur(overBudget.reduce((s, b) => s + b.spent - b.limit, 0))} above plan
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  )
}

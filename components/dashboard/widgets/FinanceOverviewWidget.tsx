"use client"

import WidgetShell from "../WidgetShell"
import { useFinanceSummary } from "@/lib/finance-summary"
import { fmt } from "@/lib/fmt"
import { L } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

export default function FinanceOverviewWidget(props: ShellProps) {
  const { data, loading } = useFinanceSummary()

  return (
    <WidgetShell title={L("Visão Financeira", "Finance Overview")} color="var(--c-fin)" glyph="chart-line" {...props}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                height: 13,
                width: `${55 + i * 12}%`,
                background: "var(--bg-raised-2)",
                borderRadius: 4,
                animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
              }}
            />
          ))}
        </div>
      ) : !data ? (
        <div style={{ color: "var(--ink-faint)", fontSize: 12 }}>
          {L("Sem dados financeiros", "No financial data")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              {L("Patrimônio Líquido", "Net Worth")}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {fmt.eurk(data.netWorth)}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: L("Conta", "Cash"),    value: data.totalCash,   neg: false },
              { label: L("Invest.", "Invest."), value: data.totalInvest, neg: false },
              { label: L("Dívida", "Debt"),   value: data.totalDebt,   neg: true  },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: "var(--bg-inset)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 10px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--ink-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 3,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: stat.neg ? "var(--neg)" : "var(--c-fin)",
                  }}
                >
                  {fmt.eurk(stat.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetShell>
  )
}

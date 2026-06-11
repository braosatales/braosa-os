"use client"

import { useState, useEffect } from "react"
import WidgetShell from "../WidgetShell"
import { Ring } from "@/components/ui"
import { L } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

type Props = ShellProps & { onNavigate?: (id: string) => void }

type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number }
type Profile = { target_calories: number; target_protein_g: number; target_carbs_g: number; target_fat_g: number }

export default function NutritionWidget({ onNavigate, ...shellProps }: Props) {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const today = new Date().toISOString().split("T")[0]
    Promise.all([
      fetch(`/api/nutrition/logs?date=${today}`).then(r => r.ok ? r.json() : null),
      fetch("/api/nutrition/profile").then(r => r.ok ? r.json() : null),
    ]).then(([logsData, profileData]) => {
      if (cancelled) return
      if (logsData) setTotals(logsData.totals ?? null)
      if (profileData) setProfile(profileData.profile ?? null)
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const target = {
    calories:  profile?.target_calories  ?? 2150,
    protein_g: profile?.target_protein_g ?? 170,
    carbs_g:   profile?.target_carbs_g   ?? 215,
    fat_g:     profile?.target_fat_g     ?? 65,
  }

  const consumed = totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  const calRatio = Math.min(1, consumed.calories / target.calories)
  const calPct   = consumed.calories / target.calories
  const ringColor = calPct < 0.9 ? "var(--pos)" : calPct <= 1.1 ? "var(--c-fin)" : "var(--neg)"

  return (
    <WidgetShell title={L("Nutrição", "Nutrition")} color="var(--c-nutrition)" glyph="activity" {...shellProps}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 20, borderRadius: 6, background: "var(--bg-raised-2)", animation: "skeleton-pulse 1.2s ease-in-out infinite alternate" }} />
          ))}
        </div>
      ) : consumed.calories === 0 && !totals ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", textAlign: "center" }}>
            {L("Nada registado hoje", "Nothing logged today")}
          </div>
          <button
            className="btn"
            style={{ fontSize: 11, padding: "4px 10px", color: "var(--c-nutrition)" }}
            onClick={() => onNavigate?.("nutrition")}
          >
            {L("Registar Refeição", "Log Meal")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
          {/* Calorie ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Ring value={calRatio} color={ringColor} size={52} stroke={5}>
              <div style={{ textAlign: "center" }}>
                <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                  {Math.round(consumed.calories)}
                </div>
              </div>
            </Ring>
            <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
              {L(`de ${target.calories} kcal`, `of ${target.calories} kcal`)}
            </div>
          </div>

          {/* Macro mini bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "P", value: consumed.protein_g, tgt: target.protein_g, color: "var(--c-health)" },
              { label: "H", value: consumed.carbs_g,   tgt: target.carbs_g,   color: "var(--c-fin)"    },
              { label: "G", value: consumed.fat_g,     tgt: target.fat_g,     color: "var(--c-task)"  },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, fontSize: 10, color: "var(--ink-faint)", fontWeight: 600 }}>{m.label}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--bg-inset)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, (m.value / m.tgt) * 100)}%`,
                    borderRadius: 99,
                    background: m.color,
                    transition: "width .4s ease",
                  }} />
                </div>
                <span className="tnum" style={{ fontSize: 10, color: "var(--ink-faint)", width: 52, textAlign: "right" }}>
                  {Math.round(m.value)}g/{m.tgt}g
                </span>
              </div>
            ))}
          </div>

          {/* Log button */}
          <div style={{ marginTop: "auto" }}>
            <button
              className="btn"
              style={{ fontSize: 11, padding: "4px 10px", color: "var(--c-nutrition)" }}
              onClick={() => onNavigate?.("nutrition")}
            >
              + {L("Registar", "Log")}
            </button>
          </div>
        </div>
      )}
    </WidgetShell>
  )
}

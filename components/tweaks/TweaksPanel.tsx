"use client"

import { createContext, useContext, useState } from "react"
import { Icon } from "@/components/ui"
import { useTweaks, saveTweaks, TWEAK_DEFAULTS, type Tweaks } from "@/lib/tweaks"

// ─── Context ─────────────────────────────────────────────────────────────────

export const TweaksPanelContext = createContext<{ previewDrag: boolean }>({ previewDrag: false })

export function useTweaksPanel() {
  return useContext(TweaksPanelContext)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      letterSpacing: "0.14em",
      color: "var(--ink-faint)",
      textTransform: "uppercase",
      marginTop: 16,
      marginBottom: 8,
    }}>
      {label}
    </div>
  )
}

function FontRadio({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 7,
              cursor: "pointer",
              border: `1px solid ${active ? "var(--c-task)" : "var(--edge)"}`,
              background: active ? "var(--c-task-dim)" : "var(--bg-raised-2)",
              color: active ? "var(--c-task)" : "var(--ink-dim)",
              transition: "border-color .15s, background .15s, color .15s",
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  accent,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  accent: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{label}</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-faint)",
          background: "var(--bg-inset)",
          padding: "1px 5px",
          borderRadius: 4,
        }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        className="brange"
        min={min}
        max={max}
        value={value}
        style={{
          "--accent": accent,
          "--pct": `${pct}%`,
        } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="toggle-track"
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? "var(--c-fin)" : "var(--bg-inset)",
        flexShrink: 0,
      }}
    >
      <div
        className="toggle-thumb"
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transform: on ? "translateX(16px)" : "translateX(2px)",
        }}
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TweaksPanel({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [previewDrag, setPreviewDrag] = useState(false)
  const [tweaks, setTweak] = useTweaks()

  function handleReset() {
    saveTweaks({ ...TWEAK_DEFAULTS })
  }

  return (
    <TweaksPanelContext.Provider value={{ previewDrag }}>
      {children}

      {/* Trigger tab */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 200,
          width: 22,
          height: 72,
          borderRadius: "12px 0 0 12px",
          background: "var(--bg-raised-2)",
          border: "1px solid var(--edge)",
          borderRight: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--ink-faint)",
          padding: 0,
          transition: "color .15s, border-color .15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.color = "var(--ink)"
          el.style.borderColor = "var(--edge-strong)"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.color = "var(--ink-faint)"
          el.style.borderColor = "var(--edge)"
        }}
        aria-label="Tweaks"
      >
        <div style={{ transform: "rotate(90deg)", display: "flex" }}>
          <Icon name="cog" size={13} />
        </div>
      </button>

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 260,
          zIndex: 199,
          background: "linear-gradient(180deg, var(--bg-raised), oklch(0.205 0.007 70))",
          borderLeft: "1px solid var(--edge)",
          backdropFilter: "blur(12px)",
          padding: "20px 16px",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .28s cubic-bezier(.2,.8,.2,1)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.18em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
          }}>
            Tweaks
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-faint)",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Typography */}
        <SectionLabel label="Typography" />
        <div style={{ marginBottom: 8, fontSize: 11, color: "var(--ink-faint)" }}>Display font</div>
        <FontRadio
          options={["Outfit", "Plus Jakarta Sans", "Space Grotesk"]}
          value={tweaks.displayFont}
          onChange={(v) => setTweak("displayFont", v as Tweaks["displayFont"])}
        />
        <div style={{ marginTop: 10, marginBottom: 8, fontSize: 11, color: "var(--ink-faint)" }}>Body font</div>
        <FontRadio
          options={["DM Sans", "Inter"]}
          value={tweaks.bodyFont}
          onChange={(v) => setTweak("bodyFont", v as Tweaks["bodyFont"])}
        />

        {/* Feel */}
        <SectionLabel label="Feel" />
        <SliderRow
          label="Accent glow"
          value={tweaks.accentIntensity}
          min={0}
          max={100}
          accent="var(--c-fin)"
          onChange={(v) => setTweak("accentIntensity", v)}
        />
        <SliderRow
          label="Corner roundness"
          value={tweaks.roundness}
          min={4}
          max={22}
          accent="var(--c-task)"
          onChange={(v) => setTweak("roundness", v)}
        />

        {/* Demo */}
        <SectionLabel label="Demo" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>Preview widget drag state</span>
          <ToggleSwitch on={previewDrag} onChange={setPreviewDrag} />
        </div>

        {/* Debug */}
        <SectionLabel label="Debug" />
        <button
          onClick={handleReset}
          style={{
            width: "100%",
            fontSize: 11,
            color: "var(--ink-faint)",
            border: "1px solid var(--edge)",
            background: "transparent",
            borderRadius: "var(--radius-sm)",
            padding: 7,
            cursor: "pointer",
          }}
        >
          Reset tweaks
        </button>
      </div>
    </TweaksPanelContext.Provider>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"

interface PinPadProps {
  mode: 'entry' | 'setup'
  title?: string
  subtitle?: string
  error?: string
  onComplete: (pin: string) => void
  onClear?: () => void
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
]

export default function PinPad({ mode, title, subtitle, error, onComplete, onClear }: PinPadProps) {
  const [pin, setPin] = useState("")
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) {
      const el = dotsRef.current
      if (el) {
        el.classList.remove("lock-shake")
        void el.offsetWidth
        el.classList.add("lock-shake")
      }
      setPin("")
    }
  }, [error])

  const press = (digit: string) => {
    setPin(prev => {
      if (prev.length >= 4) return prev
      const next = prev + digit
      if (next.length === 4) {
        setTimeout(() => onComplete(next), 0)
        return ""
      }
      return next
    })
  }

  const backspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {title && (
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--ink)",
          marginBottom: subtitle ? 4 : 24,
          textAlign: "center",
        }}>
          {title}
        </span>
      )}
      {subtitle && (
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: error ? "#E5484D" : "var(--ink-faint)",
          marginBottom: 24,
          textAlign: "center",
        }}>
          {subtitle}
        </span>
      )}

      <div
        ref={dotsRef}
        onAnimationEnd={(e) => {
          if (e.animationName === "lock-shake") {
            dotsRef.current?.classList.remove("lock-shake")
            onClear?.()
          }
        }}
        style={{ display: "flex", gap: 16, marginBottom: 36 }}
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: i < pin.length ? "var(--c-dash)" : "transparent",
              border: `1px solid ${i < pin.length ? "var(--c-dash)" : "var(--edge)"}`,
              transition: "background .12s ease, border-color .12s ease",
            }}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 280 }}>
        {KEYS.flat().map(digit => (
          <button
            key={digit}
            onClick={() => press(digit)}
            style={{
              minHeight: 72,
              fontSize: 24,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color: "var(--ink)",
              background: "#1C1F2E",
              border: "1px solid #3A3F56",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          style={{
            minHeight: 72,
            fontSize: 24,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            color: "var(--ink)",
            background: "#1C1F2E",
            border: "1px solid #3A3F56",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          0
        </button>
        <button
          onClick={backspace}
          style={{
            minHeight: 72,
            fontSize: 20,
            fontFamily: "var(--font-body)",
            color: "var(--ink-dim)",
            background: "#1C1F2E",
            border: "1px solid #3A3F56",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  )
}

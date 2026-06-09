"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useLang } from "@/lib/i18n"
import { getLockPassword, unlock as doUnlock } from "@/lib/lockscreen"
import { useIsMobile } from "@/lib/hooks/useIsMobile"

interface Props {
  onUnlock: () => void
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

const PT_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const PT_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function LockScreen({ onUnlock }: Props) {
  const lang = useLang()
  const isMobile = useIsMobile()
  const [now, setNow] = useState<Date | null>(null)
  const [pw, setPw] = useState("")
  const [exiting, setExiting] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputWrapRef = useRef<HTMLDivElement>(null)
  const hasPassword = getLockPassword() !== null

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const doExit = useCallback(() => {
    setExiting(true)
    setTimeout(onUnlock, 320)
  }, [onUnlock])

  const attemptUnlock = useCallback(() => {
    if (!hasPassword) {
      doExit()
      return
    }
    if (doUnlock(pw)) {
      doExit()
    } else {
      setPw("")
      const wrap = inputWrapRef.current
      if (wrap) {
        wrap.classList.remove("lock-shake")
        void wrap.offsetWidth
        wrap.classList.add("lock-shake")
      }
    }
  }, [pw, hasPassword, doExit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") attemptUnlock()
  }

  const timeStr = now
    ? `${pad(now.getHours())}:${pad(now.getMinutes())}`
    : "--:--"

  const dateStr = now
    ? lang === "pt"
      ? `${PT_DAYS[now.getDay()]}, ${now.getDate()} de ${PT_MONTHS[now.getMonth()]}`
      : `${EN_DAYS[now.getDay()]}, ${EN_MONTHS[now.getMonth()]} ${now.getDate()}`
    : ""

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(120% 100% at 50% 0%, oklch(0.205 0.007 70), var(--bg-void))",
        animation: exiting
          ? "lock-zoom .35s ease forwards"
          : "fade-in .4s ease both",
      }}
    >
      {/* Ambient glows */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={glowStyle(1)} />
        <div style={glowStyle(2)} />
      </div>

      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: isMobile ? '100%' : 380,
        padding: isMobile ? '0 24px' : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}>
        {/* Label */}
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--ink-faint)",
          marginBottom: 20,
          textTransform: "uppercase",
        }}>
          BRAOSA OS
        </span>

        {/* Clock */}
        <span
          className="tnum"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: isMobile ? 56 : 72,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {timeStr}
        </span>

        {/* Date */}
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--ink-dim)",
          marginTop: 8,
          marginBottom: 40,
        }}>
          {dateStr}
        </span>

        {hasPassword ? (
          <>
            <div
              ref={inputWrapRef}
              style={{ width: "100%", maxWidth: 260 }}
              onAnimationEnd={(e) => {
                if (e.animationName === "lock-shake") {
                  inputWrapRef.current?.classList.remove("lock-shake")
                }
              }}
            >
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••"
                autoFocus
                className="glow-focus"
                style={{
                  width: "100%",
                  background: "var(--bg-inset)",
                  border: "1px solid var(--edge)",
                  borderRadius: "var(--radius-sm)",
                  padding: "11px 16px",
                  fontSize: 15,
                  textAlign: "center",
                  letterSpacing: "0.12em",
                  color: "var(--ink)",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  "--accent": "var(--c-dash)",
                } as React.CSSProperties}
              />
            </div>

            <button
              onClick={attemptUnlock}
              className="btn"
              style={{ width: "100%", maxWidth: 260, marginTop: 12, justifyContent: "center" }}
            >
              {lang === "pt" ? "Entrar" : "Unlock"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={attemptUnlock}
              className="btn"
              style={{ justifyContent: "center", minWidth: 120 }}
            >
              {lang === "pt" ? "Entrar" : "Enter"}
            </button>
            <span style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--ink-faint)",
              textAlign: "center",
            }}>
              {lang === "pt"
                ? "Define uma senha em Definições"
                : "Set a lock password in Settings"}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function glowStyle(idx: 1 | 2): React.CSSProperties {
  const shared: React.CSSProperties = {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(80px)",
    opacity: 0.06,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  }
  if (idx === 1) return {
    ...shared,
    width: 420,
    height: 420,
    top: "10%",
    left: "20%",
    background: "var(--c-dash)",
    animation: "rise-soft 8s ease-in-out infinite alternate",
  }
  return {
    ...shared,
    width: 320,
    height: 320,
    bottom: "15%",
    right: "15%",
    background: "var(--c-braosa)",
    animation: "rise-soft 12s ease-in-out infinite alternate",
  }
}

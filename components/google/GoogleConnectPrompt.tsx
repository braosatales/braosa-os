"use client"

import { Icon } from "@/components/ui"
import { useLang } from "@/lib/i18n"
import type { IconName } from "@/lib/icons"

type Props = {
  tabName: string
  description: string
  icon: string
  color: string
}

export default function GoogleConnectPrompt({ tabName, description, icon, color }: Props) {
  const lang = useLang()

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        maxWidth: 420,
        width: "100%",
      }}>
        {/* Icon box */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: `color-mix(in oklch, ${color} 16%, var(--bg-raised))`,
          border: `1px solid color-mix(in oklch, ${color} 32%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 28px -8px ${color}`,
        }}>
          <span style={{ color }}>
            <Icon name={icon as IconName} size={22} />
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 600,
          color: "var(--ink)",
        }}>
          {tabName}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 14,
          color: "var(--ink-dim)",
          lineHeight: 1.6,
          textAlign: "center",
        }}>
          {description}
        </div>

        {/* Connect button */}
        <button
          className="btn"
          onClick={() => { window.location.href = '/api/google/connect' }}
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
            background: `color-mix(in oklch, ${color} 18%, var(--bg-raised))`,
            border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
            color,
          }}
        >
          {lang === "pt" ? "Ligar Conta Google" : "Connect Google Account"}
        </button>

        {/* One connection tagline */}
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-faint)",
          letterSpacing: "0.06em",
          marginTop: -8,
        }}>
          {lang === "pt" ? "Uma ligação · Quatro funcionalidades" : "One connection · Four features"}
        </div>

        {/* Security note */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: "var(--ink-faint)",
          fontSize: 11,
        }}>
          <Icon name="lock" size={11} />
          {lang === "pt"
            ? "OAuth 2.0 seguro · Podes desligar a qualquer momento"
            : "Secure OAuth 2.0 · Disconnect anytime"}
        </div>
      </div>
    </div>
  )
}

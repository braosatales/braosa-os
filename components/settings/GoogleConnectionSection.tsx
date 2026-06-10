"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui"
import { useLang } from "@/lib/i18n"

type GoogleStatus = {
  connected: boolean
  email: string | null
  name: string | null
  picture: string | null
  scopes: string[]
}

const SCOPE_LABELS: Record<string, string> = {
  'https://www.googleapis.com/auth/gmail.readonly': 'Gmail',
  'https://www.googleapis.com/auth/gmail.send': 'Gmail',
  'https://www.googleapis.com/auth/gmail.modify': 'Gmail',
  'https://www.googleapis.com/auth/calendar': 'Calendar',
  'https://www.googleapis.com/auth/contacts': 'Contacts',
  'https://www.googleapis.com/auth/drive': 'Drive',
}

function getScopeChips(scopes: string[]): string[] {
  const seen = new Set<string>()
  for (const s of scopes) {
    const label = SCOPE_LABELS[s]
    if (label) seen.add(label)
  }
  return Array.from(seen)
}

type Props = { open: boolean }

export default function GoogleConnectionSection({ open }: Props) {
  const lang = useLang()
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/google/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [open])

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/google/disconnect', { method: 'POST' }).catch(() => {})
    setStatus({ connected: false, email: null, name: null, picture: null, scopes: [] })
    setDisconnecting(false)
  }

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--ink-faint)",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    marginBottom: 10,
  }

  return (
    <div style={{ padding: 20, borderTop: "1px solid var(--edge-soft)" }}>
      <div style={sectionLabel}>Google</div>

      {!status ? (
        <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
          {lang === "pt" ? "A carregar…" : "Loading…"}
        </div>
      ) : status.connected ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Profile row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {status.picture ? (
              <img
                src={status.picture}
                alt=""
                style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--bg-raised-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon name="user" size={14} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {status.name ?? status.email}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {status.email}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-pos, #4ade80)" }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--c-pos, #4ade80)", letterSpacing: "0.08em",
              }}>
                {lang === "pt" ? "Ligado" : "Connected"}
              </span>
            </div>
          </div>

          {/* Scope chips */}
          {getScopeChips(status.scopes).length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {getScopeChips(status.scopes).map(chip => (
                <span
                  key={chip}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "var(--bg-raised-2)",
                    border: "1px solid var(--edge)",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Disconnect */}
          <button
            className="btn"
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={{ alignSelf: "flex-start", color: "var(--c-neg, #f87171)" }}
          >
            {lang === "pt" ? "Desligar" : "Disconnect"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.5 }}>
            {lang === "pt"
              ? "Liga a tua conta Google para Mail, Calendar, Contacts e Drive."
              : "Connect your Google account for Mail, Calendar, Contacts and Drive."}
          </div>
          <button
            className="btn"
            onClick={() => { window.location.href = '/api/google/connect' }}
            style={{
              alignSelf: "flex-start",
              background: "color-mix(in oklch, var(--c-mail) 18%, var(--bg-raised))",
              border: "1px solid color-mix(in oklch, var(--c-mail) 40%, transparent)",
              color: "var(--c-mail)",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <Icon name="link" size={14} />
            {lang === "pt" ? "Ligar Google" : "Connect Google"}
          </button>
        </div>
      )}
    </div>
  )
}

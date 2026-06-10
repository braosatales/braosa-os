"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui"
import Ring from "@/components/ui/Ring"
import { SYSTEMS, COMPANIES } from "@/lib/constants"
import { useLang } from "@/lib/i18n"
import type { OSUser } from "@/lib/user"

type Props = {
  active: string
  onNavigate: (id: string) => void
  onLock: () => void
  onSettings: () => void
  user: OSUser | null
}

const divider = (
  <div style={{ width: 1, height: 26, background: "var(--edge)", flexShrink: 0 }} />
)

export default function TopNav({ active, onNavigate, onLock, onSettings, user }: Props) {
  const lang = useLang()
  const [inboxUnread, setInboxUnread] = useState(0)

  useEffect(() => {
    function fetchUnread() {
      fetch("/api/mail/labels")
        .then(r => r.json())
        .then(d => {
          const inbox = (d.labels ?? []).find((l: any) => l.id === "INBOX")
          setInboxUnread(inbox?.unreadCount ?? 0)
        })
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      style={{
        height: 62,
        flexShrink: 0,
        background: "linear-gradient(180deg, oklch(0.225 0.007 72 / 0.92), oklch(0.195 0.006 70 / 0.92))",
        borderBottom: "1px solid var(--edge)",
        backdropFilter: "blur(12px)",
        padding: "0 18px",
        gap: 18,
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Settings */}
      <button
        onClick={onSettings}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "var(--bg-raised-2)",
          border: "1px solid var(--edge)",
          color: "var(--ink-dim)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="cog" size={18} />
      </button>

      {/* System tabs */}
      <nav
        style={{
          flex: 1,
          minWidth: 0,
          overflowX: "auto",
          gap: 3,
          display: "flex",
          alignItems: "center",
        }}
      >
        {SYSTEMS.map((sys) => {
          const isActive = active === sys.id
          return (
            <button
              key={sys.id}
              onClick={() => onNavigate(sys.id)}
              style={{
                background: isActive ? sys.dim : "transparent",
                border: isActive
                  ? `1px solid color-mix(in oklch, ${sys.color} 40%, transparent)`
                  : "1px solid transparent",
                color: isActive ? sys.color : "var(--ink-dim)",
                fontWeight: isActive ? 600 : 500,
                padding: "8px 13px",
                borderRadius: 9,
                fontSize: 13.5,
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {/* Icon with optional unread badge for mail */}
              <div style={{ position: "relative" }}>
                <Icon name={sys.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
                {sys.id === "email" && inboxUnread > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -5, right: -6,
                    minWidth: 14, height: 14,
                    borderRadius: 99,
                    background: "var(--neg)",
                    color: "white",
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1, padding: "0 3px",
                    border: "1.5px solid var(--bg-raised)",
                  }}>
                    {inboxUnread > 9 ? "9+" : inboxUnread}
                  </span>
                )}
              </div>
              <span>{lang === "en" ? sys.label : sys.labelPt}</span>
            </button>
          )
        })}
      </nav>

      {/* Right section */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Company tabs */}
        {COMPANIES.map((co) => {
          const isActive = active === co.id
          return (
            <button
              key={co.id}
              onClick={() => onNavigate(co.id)}
              style={{
                background: isActive ? co.dim : "transparent",
                border: isActive
                  ? `1px solid color-mix(in oklch, ${co.color} 40%, transparent)`
                  : "1px solid transparent",
                color: isActive ? co.color : "var(--ink-dim)",
                fontWeight: isActive ? 600 : 500,
                padding: "7px 11px",
                borderRadius: 9,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={co.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
              <span>{co.label}</span>
            </button>
          )
        })}

        {divider}

        {/* Streak */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--c-health)" }}>
          <Icon name="flame" size={14} stroke={1.8} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>
            {user?.streak ?? 0}
          </span>
        </div>

        {divider}

        {/* Life score */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Ring value={user?.xpToNext ?? 0} color="var(--c-fin)" size={34} stroke={3.5} track="var(--edge-soft)">
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-soft)" }}>
              {user?.level ?? 1}
            </span>
          </Ring>
          <div className="hide-below-720" style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--ink)" }}>
              {user?.lifeScore ?? 0}
            </span>
            <span style={{ fontSize: 8.5, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
              LIFE SCORE
            </span>
          </div>
        </div>

        {divider}

        {/* Lock */}
        <button
          onClick={onLock}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--bg-raised-2)", border: "1px solid var(--edge)",
            color: "var(--ink-dim)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="lock" size={16} />
        </button>
      </div>
    </header>
  )
}

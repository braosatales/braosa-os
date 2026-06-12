"use client"

import { useState, useEffect } from "react"
import Modal from "@/components/ui/Modal"
import { Icon } from "@/components/ui"
import { getUser, type OSUser } from "@/lib/user"
import { getLang, setLang, type Lang } from "@/lib/i18n"
import { hasLockPassword, setLockPassword, removeLockPassword } from "@/lib/lockscreen"
import { useTweaks } from "@/lib/tweaks"
import GoogleConnectionSection from "./GoogleConnectionSection"
import { APP_VERSION } from "@/lib/constants"

type Props = {
  open: boolean
  onClose: () => void
  onLock: () => void
}

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--ink-faint)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  marginBottom: 10,
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 13px",
        borderRadius: "var(--radius-sm)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        background: active ? "var(--c-task-dim)" : "var(--bg-raised-2)",
        border: active ? "1px solid var(--c-task)" : "1px solid var(--edge)",
        color: active ? "var(--c-task)" : "var(--ink-dim)",
        transition: "background .15s, border-color .15s, color .15s",
      }}
    >
      {children}
    </button>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  const pct = (((value - min) / (max - min)) * 100).toFixed(1)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    e.target.style.setProperty("--pct", (((v - min) / (max - min)) * 100) + "%")
    onChange(v)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        className="brange"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        style={{ "--pct": pct + "%" } as React.CSSProperties}
      />
    </div>
  )
}

export default function SettingsModal({ open, onClose, onLock }: Props) {
  const [user, setUser] = useState<OSUser | null>(null)
  const [name, setName] = useState("")
  const [lang, setLangState] = useState<Lang>("pt")
  const [tweaks, setTweak] = useTweaks()

  const [hasPw, setHasPw] = useState(false)
  const [pwInput, setPwInput] = useState("")
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    if (!open) return
    getUser().then((u) => {
      setUser(u)
      setName(u?.name ?? "")
    })
    setLangState(getLang())
    hasLockPassword().then(setHasPw)
    setPwInput("")
    setChangingPw(false)
  }, [open])

  async function handleNameBlur() {
    if (!user || name === user.name) return
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
  }

  function handleLangToggle(l: Lang) {
    setLang(l)
    setLangState(l)
  }

  async function handleSetPassword() {
    if (!pwInput.trim()) return
    await setLockPassword(pwInput.trim())
    setHasPw(true)
    setPwInput("")
    setChangingPw(false)
  }

  async function handleRemovePassword() {
    await removeLockPassword()
    setHasPw(false)
    setPwInput("")
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <Modal open={open} onClose={onClose} width={480}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--edge-soft)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Settings
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 2 }}>
            {user?.email ?? ""}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--edge)",
            color: "var(--ink-dim)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", maxHeight: "75vh" }}>
        {/* Profile */}
        <div style={{ padding: 20 }}>
          <div style={sectionLabel}>Profile</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--ink-faint)", display: "block", marginBottom: 5 }}>
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                className="glow-focus"
                style={{
                  width: "100%",
                  padding: "8px 11px",
                  background: "var(--bg-inset)",
                  border: "1px solid var(--edge)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--ink-faint)", display: "block", marginBottom: 5 }}>
                Language
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <ToggleBtn active={lang === "pt"} onClick={() => handleLangToggle("pt")}>PT</ToggleBtn>
                <ToggleBtn active={lang === "en"} onClick={() => handleLangToggle("en")}>EN</ToggleBtn>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div style={{ padding: 20, borderTop: "1px solid var(--edge-soft)" }}>
          <div style={sectionLabel}>Appearance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--ink-faint)", display: "block", marginBottom: 6 }}>
                Display font
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["Outfit", "Plus Jakarta Sans", "Space Grotesk"] as const).map((f) => (
                  <ToggleBtn
                    key={f}
                    active={tweaks.displayFont === f}
                    onClick={() => setTweak("displayFont", f)}
                  >
                    {f}
                  </ToggleBtn>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--ink-faint)", display: "block", marginBottom: 6 }}>
                Body font
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["DM Sans", "Inter"] as const).map((f) => (
                  <ToggleBtn
                    key={f}
                    active={tweaks.bodyFont === f}
                    onClick={() => setTweak("bodyFont", f)}
                  >
                    {f}
                  </ToggleBtn>
                ))}
              </div>
            </div>
            <SliderRow
              label="Accent glow"
              value={tweaks.accentIntensity}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => setTweak("accentIntensity", v)}
            />
            <SliderRow
              label="Corner roundness"
              value={tweaks.roundness}
              min={4}
              max={22}
              unit="px"
              onChange={(v) => setTweak("roundness", v)}
            />
          </div>
        </div>

        {/* Security */}
        <div style={{ padding: 20, borderTop: "1px solid var(--edge-soft)" }}>
          <div style={sectionLabel}>Security</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Lock password */}
            <div>
              <label style={{ fontSize: 12, color: "var(--ink-faint)", display: "block", marginBottom: 6 }}>
                Lock password
              </label>
              {!hasPw || changingPw ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="password"
                    placeholder={changingPw ? "New password" : "Set a password"}
                    value={pwInput}
                    onChange={(e) => setPwInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                    className="glow-focus"
                    style={{
                      flex: 1,
                      padding: "8px 11px",
                      background: "var(--bg-inset)",
                      border: "1px solid var(--edge)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--ink)",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button className="btn" onClick={handleSetPassword}>
                    {changingPw ? "Save" : "Set password"}
                  </button>
                  {changingPw && (
                    <button
                      className="btn"
                      onClick={() => { setChangingPw(false); setPwInput("") }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--ink-dim)", letterSpacing: "0.2em" }}>
                    ••••••••
                  </span>
                  <button
                    onClick={() => { setChangingPw(true); setPwInput("") }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--c-task)",
                      fontSize: 13,
                      cursor: "pointer",
                      padding: "2px 4px",
                    }}
                  >
                    Change
                  </button>
                  <button
                    className="btn"
                    onClick={handleRemovePassword}
                    style={{ marginLeft: "auto" }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Lock now */}
            <button
              className="btn"
              onClick={() => { onLock(); onClose() }}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Icon name="lock" size={15} />
              Lock BraosaOS
            </button>
          </div>
        </div>

        {/* Google */}
        <GoogleConnectionSection open={open} />

        {/* Account */}
        <div style={{ padding: 20, borderTop: "1px solid var(--edge-soft)" }}>
          <div style={sectionLabel}>Account</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>{user?.email ?? ""}</div>
            <button className="btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "12px 20px", borderTop: "1px solid var(--edge-soft)" }}>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: 'var(--ink-faint)', textAlign: 'center' }}>
          BraosaOS · v{APP_VERSION} · Alpha
        </p>
      </div>
    </Modal>
  )
}

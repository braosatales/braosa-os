"use client"

import { useState, useEffect, useContext } from "react"
import { Icon } from "@/components/ui"
import { getUser, type OSUser } from "@/lib/user"
import { getLang, setLang, useLang, type Lang } from "@/lib/i18n"
import { hasLockPassword, setLockPassword, removeLockPassword, lockSession } from "@/lib/lockscreen"
import { useTweaks } from "@/lib/tweaks"
import { APP_VERSION } from "@/lib/constants"
import { MobileSubTabContext } from "@/lib/mobile-context"
import { useLock } from "@/app/(os)/layout"

// ─── Version History ─────────────────────────────────────────────────────────

const VERSION_HISTORY = [
  {
    version: '1.1.1',
    date: 'Jun 2026',
    group: 'Tasks Mobile Polish',
    entries: [
      'Tasks mobile: background, typography, FAB positioning, safe area fixes',
    ]
  },
  {
    version: '1.1.0',
    date: 'Jun 2026',
    group: 'Mobile Home Screen — Dashboard Removed + Notifications',
    entries: [
      'Dashboard removed from mobile home screen (desktop-only feature)',
      'Settings removed from mobile home screen (desktop-only)',
      'Notification badges added per app on home screen',
      'Mail: unread count badge',
      'Contacts: pending review count badge',
      'Tasks: overdue count badge',
      'Calendar: today events count badge',
      'Health: ! badge if workout planned but not logged today',
      'Nutrition: ! badge if no meals logged today after 13:00',
      'Verum: ! badge if any milestone overdue',
    ]
  },
  {
    version: '1.0.2',
    date: 'Jun 2026',
    group: 'Mobile Dashboard + Settings App',
    entries: [
      'Settings added as a full mobile app with 6 sub-tabs',
      'Complete version history screen',
      'Mobile dashboard grid overflow fixed',
      'Widget empty states audited and fixed',
      'Dashboard renamed from Início to Dashboard',
      'Resize grip and drag handle hidden on mobile',
    ]
  },
  {
    version: '1.0.1',
    date: 'Jun 2026',
    group: 'Auth + Lock Screen Fixes',
    entries: [
      'Google OAuth no longer triggers TOTP',
      'Lock screen password stored in Supabase (cross-device)',
      'Lock screen now shows correctly on mobile',
      'Home screen colors fixed for Safari',
      'Drag to reorder icons in edit mode',
      'Sub-tab shortcuts added to home screen',
      'WIP badges added to all app icons',
    ]
  },
  {
    version: '1.0.0',
    date: 'Jun 2026',
    group: 'Alpha Launch',
    entries: [
      'All 13 apps live: Dashboard, Finances, Tasks, Notes, Health, Nutrition, Mail, Calendar, Contacts, Drive, AI, Braosa, Verum',
      'Mobile OS home screen with custom app icons',
      'Full color system with distinct per-app colors',
      'D20 app icon for iOS home screen',
      'Dashboard layout saved to Supabase (cross-device)',
    ]
  },
  {
    version: '0.12.0',
    date: 'Jun 2026',
    group: 'Mobile OS',
    entries: [
      '0.12.1 — Mobile home screen launcher (iOS-style app grid)',
      '0.12.2 — Full mobile audit (44px tap targets, keyboard-aware inputs, safe areas)',
      '0.12.3 — Color system overhaul + 13 custom SVG app icons',
      '0.12.4 — Dashboard layout persistence (Supabase, cross-device)',
      '0.12.5 — D20 app icon for iOS Safari Add to Home Screen',
    ]
  },
  {
    version: '0.11.0',
    date: 'Jun 2026',
    group: 'Braosa + Verum + Integrations',
    entries: [
      '0.11.1 — Braosa tab (KPI dashboard, product tracker, content planner)',
      '0.11.2 — Verum tab (projects, team, financials)',
      '0.11.3 — GoCardless bank integration (Revolut, CGD, Santander, Millennium)',
      '0.11.4 — Real AI chat with Anthropic API + full OS context',
      '0.11.5 — Invoice scanner (photo → AI extraction → transaction import)',
    ]
  },
  {
    version: '0.10.0',
    date: 'Jun 2026',
    group: 'Nutrition',
    entries: [
      '0.10.1 — Nutrition tracker: diary, macro targets, food database (30 Portuguese foods), weight tracking',
      '0.10.2 — Meal photo scanner: AI identifies food + estimates macros automatically',
    ]
  },
  {
    version: '0.9.0',
    date: 'Jun 2026',
    group: 'Health System',
    entries: [
      '0.9.1 — Health shell + workout profile onboarding',
      '0.9.2 — Exercise library (25 exercises) + routine builder + YouTube video preferences',
      '0.9.3 — AI journey planner: weekly training plan generation',
      '0.9.4 — Workout logger + Spotify music control + YouTube tutorials',
      '0.9.5 — Progress charts + history + Whoop integration tables ready',
    ]
  },
  {
    version: '0.8.0',
    date: 'Jun 2026',
    group: 'Calendar + Drive',
    entries: [
      '0.8.1 — Google Calendar: day/week/month views, events, recurring, attendees, AI suggestions',
      '0.8.2 — Google Drive browser + markdown editor (RRR + Braosa Universe folders)',
      '0.8.3 — Drive AI read access: AI aware of your Drive file names',
    ]
  },
  {
    version: '0.7.0',
    date: 'Jun 2026',
    group: 'Google + Contacts + Mail',
    entries: [
      '0.7.1 — Google OAuth: one connection for Mail, Calendar, Contacts, Drive',
      '0.7.2 — Contacts CRM: Google sync, interaction log, pending review from emails',
      '0.7.3 — Mail: inbox, threads, AI draft replies, contact extraction',
      '0.7.4 — Mail: smart inbox triage, labels, filters, keyboard shortcuts',
    ]
  },
  {
    version: '0.6.0',
    date: 'May 2026',
    group: 'Auth Hardening + Mobile',
    entries: [
      '0.6.1 — Full auth: email + TOTP MFA + 30-day device trust cookie',
      '0.6.2 — Mobile responsiveness: bottom nav, single column layouts, bottom sheets',
      '0.6.3 — Auth redirect chain fix: root → login → dashboard',
    ]
  },
  {
    version: '0.5.0',
    date: 'May 2026',
    group: 'Tasks + Notes',
    entries: [
      '0.5.1 — Tasks: today/board/list views, projects sidebar, drag between columns',
      '0.5.2 — Notes: grid/list, pinned, colors, tags, auto-save, archive',
      '0.5.3 — AI chat placeholder + final tab wiring',
      '0.5.4 — Data saving fix: all store mutations now verify server response',
      '0.5.5 — Dashboard widget improvements: add widget modal, remove reset button',
    ]
  },
  {
    version: '0.4.0',
    date: 'May 2026',
    group: 'Finances',
    entries: [
      '0.4.1 — Finance shell + 6-tab sub-navigation',
      '0.4.2 — Finance store + overview (net worth, assets, debt, cash)',
      '0.4.3 — Accounts + transactions (add, edit, delete, balance auto-update)',
      '0.4.4 — Debt + investments views',
      '0.4.5 — Budget + Baby Steps (Dave Ramsey 7-step framework)',
    ]
  },
  {
    version: '0.3.0',
    date: 'May 2026',
    group: 'Dashboard',
    entries: [
      '0.3.1 — Dashboard grid engine: drag, resize, dynamic columns',
      '0.3.2 — Finance dashboard widgets: net worth, assets, debt, budget',
      '0.3.3 — Task, habit, AI, weather, health, notes widgets',
      '0.3.4 — Grid overhaul: true square cells, collision detection',
    ]
  },
  {
    version: '0.2.0',
    date: 'Apr 2026',
    group: 'Auth + OS Shell',
    entries: [
      '0.2.1 — Lock screen: PIN protection, time display, unlock animation',
      '0.2.2 — Top navigation: system tabs, company tabs, life score ring',
      '0.2.3 — Settings modal: profile, appearance, security, account',
      '0.2.4 — Tweaks panel: live font, glow, roundness controls',
    ]
  },
  {
    version: '0.1.0',
    date: 'Apr 2026',
    group: 'Foundation',
    entries: [
      '0.1.1 — Design system: CSS tokens, oklch colors, animations, globals',
      '0.1.2 — UI primitives: Icon, Ring, Sparkline, Check, Modal, EmptyState',
      '0.1.3 — i18n (PT/EN), currency formatters (EUR), date helpers, confetti',
    ]
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--ink-faint)',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function SkeletonBars() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          height: 12,
          background: 'var(--bg-raised-2)',
          borderRadius: 4,
          animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate`,
          width: i === 0 ? '60%' : i === 1 ? '40%' : '80%',
        }} />
      ))}
    </div>
  )
}

function SliderRow({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void
}) {
  const pct = (((value - min) / (max - min)) * 100).toFixed(1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        className="brange"
        min={min}
        max={max}
        value={value}
        onChange={e => {
          const v = Number(e.target.value)
          e.target.style.setProperty('--pct', (((v - min) / (max - min)) * 100) + '%')
          onChange(v)
        }}
        style={{ '--pct': pct + '%' } as React.CSSProperties}
      />
    </div>
  )
}

// ─── Sub-tab: Profile ─────────────────────────────────────────────────────────

function ProfileTab() {
  const lang = useLang()
  const [user, setUser] = useState<OSUser | null>(null)
  const [name, setName] = useState('')
  const [currentLang, setCurrentLang] = useState<Lang>('pt')

  useEffect(() => {
    getUser().then(u => { setUser(u); setName(u?.name ?? '') })
    setCurrentLang(getLang())
  }, [])

  async function handleNameBlur() {
    if (!user || name === user.name) return
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  function handleLangToggle(l: Lang) {
    setLang(l)
    setCurrentLang(l)
  }

  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--c-task-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--c-task)' }}>
            {initials}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{user?.email ?? ''}</div>
      </div>

      {/* Name */}
      <div>
        <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 6 }}>
          {lang === 'pt' ? 'Nome' : 'Name'}
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="glow-focus"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px',
            background: 'var(--bg-inset)',
            border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--ink)', fontSize: 16, outline: 'none',
          }}
        />
      </div>

      {/* Language */}
      <div>
        <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 8 }}>
          {lang === 'pt' ? 'Idioma' : 'Language'}
        </label>
        <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--edge)' }}>
          {(['pt', 'en'] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => handleLangToggle(l)}
              style={{
                flex: 1, height: 48, fontSize: 15, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: currentLang === l ? 'var(--c-task-dim)' : 'var(--bg-raised)',
                color: currentLang === l ? 'var(--c-task)' : 'var(--ink-dim)',
                borderRight: l === 'pt' ? '1px solid var(--edge)' : 'none',
                transition: 'background .15s, color .15s',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-tab: Appearance ──────────────────────────────────────────────────────

function AppearanceTab() {
  const lang = useLang()
  const [tweaks, setTweak] = useTweaks()

  const displayFonts = ['Outfit', 'Plus Jakarta Sans', 'Space Grotesk'] as const
  const bodyFonts = ['DM Sans', 'Inter'] as const

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Display font */}
      <div>
        <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 10 }}>
          {lang === 'pt' ? 'Fonte de título' : 'Display font'}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayFonts.map(f => (
            <button
              key={f}
              onClick={() => setTweak('displayFont', f)}
              style={{
                width: '100%', height: 64, padding: '0 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: tweaks.displayFont === f ? 'var(--c-task-dim)' : 'var(--bg-inset)',
                border: `1.5px solid ${tweaks.displayFont === f ? 'var(--c-task)' : 'var(--edge)'}`,
                transition: 'background .15s, border-color .15s',
              }}
            >
              <span style={{ fontFamily: `"${f}", system-ui, sans-serif`, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{f}</span>
              <span style={{ fontFamily: `"${f}", system-ui, sans-serif`, fontSize: 20, color: 'var(--ink-dim)' }}>Abc</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body font */}
      <div>
        <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 10 }}>
          {lang === 'pt' ? 'Fonte de corpo' : 'Body font'}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bodyFonts.map(f => (
            <button
              key={f}
              onClick={() => setTweak('bodyFont', f)}
              style={{
                width: '100%', height: 64, padding: '0 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: tweaks.bodyFont === f ? 'var(--c-task-dim)' : 'var(--bg-inset)',
                border: `1.5px solid ${tweaks.bodyFont === f ? 'var(--c-task)' : 'var(--edge)'}`,
                transition: 'background .15s, border-color .15s',
              }}
            >
              <span style={{ fontFamily: `"${f}", system-ui, sans-serif`, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{f}</span>
              <span style={{ fontFamily: `"${f}", system-ui, sans-serif`, fontSize: 20, color: 'var(--ink-dim)' }}>Abc</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <SliderRow
        label={lang === 'pt' ? 'Intensidade do brilho' : 'Accent glow'}
        value={tweaks.accentIntensity}
        min={0} max={100} unit="%"
        onChange={v => setTweak('accentIntensity', v)}
      />
      <SliderRow
        label={lang === 'pt' ? 'Arredondamento' : 'Corner roundness'}
        value={tweaks.roundness}
        min={4} max={22} unit="px"
        onChange={v => setTweak('roundness', v)}
      />
    </div>
  )
}

// ─── Sub-tab: Security ────────────────────────────────────────────────────────

function SecurityTab() {
  const lang = useLang()
  const { lock } = useLock()
  const [hasPw, setHasPw] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hasLockPassword().then(v => { setHasPw(v); setLoading(false) })
  }, [])

  async function handleSetPassword() {
    if (!pwInput.trim()) return
    await setLockPassword(pwInput.trim())
    setHasPw(true)
    setPwInput('')
    setChangingPw(false)
  }

  async function handleRemovePassword() {
    await removeLockPassword()
    setHasPw(false)
    setPwInput('')
  }

  function handleLockNow() {
    lock()
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Lock password description */}
      <div style={{
        background: 'var(--bg-inset)',
        border: '1px solid var(--edge-soft)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <span style={{ color: 'var(--ink-dim)', flexShrink: 0, display: 'flex', paddingTop: 2 }}>
          <Icon name="lock" size={16} />
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
          {lang === 'pt' ? 'Protecção física do ecrã' : 'Physical screen protection'}
        </span>
      </div>

      {loading ? (
        <SkeletonBars />
      ) : !hasPw || changingPw ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="password"
            placeholder={changingPw
              ? (lang === 'pt' ? 'Nova senha' : 'New password')
              : (lang === 'pt' ? 'Definir senha' : 'Set password')}
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
            className="glow-focus"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', fontSize: 16,
              background: 'var(--bg-inset)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)', outline: 'none',
            }}
          />
          <button className="btn" onClick={handleSetPassword} style={{ width: '100%', justifyContent: 'center', height: 44 }}>
            {lang === 'pt' ? 'Definir Senha' : 'Set Password'}
          </button>
          {changingPw && (
            <button className="btn" onClick={() => { setChangingPw(false); setPwInput('') }} style={{ width: '100%', justifyContent: 'center', height: 44 }}>
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
            <span style={{ fontSize: 14, color: 'var(--pos)' }}>
              {lang === 'pt' ? 'Senha definida ✓' : 'Password set ✓'}
            </span>
            <button
              onClick={() => { setChangingPw(true); setPwInput('') }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--c-task)', fontSize: 14, cursor: 'pointer', padding: '4px 8px' }}
            >
              {lang === 'pt' ? 'Alterar' : 'Change'}
            </button>
          </div>
          <button className="btn" onClick={handleRemovePassword} style={{ width: '100%', justifyContent: 'center', height: 44 }}>
            {lang === 'pt' ? 'Remover' : 'Remove'}
          </button>
        </div>
      )}

      {/* Lock now */}
      <button
        className="btn-accent"
        onClick={handleLockNow}
        style={{
          width: '100%', height: 48, justifyContent: 'center',
          display: 'flex', alignItems: 'center', gap: 8,
          '--accent': '#94A3B8',
          background: 'color-mix(in oklch, #94A3B8 18%, var(--bg-raised))',
          border: '1px solid color-mix(in oklch, #94A3B8 40%, transparent)',
          color: '#94A3B8',
          borderRadius: 'var(--radius-sm)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        } as React.CSSProperties}
      >
        <Icon name="lock" size={16} />
        {lang === 'pt' ? 'Bloquear BraosaOS' : 'Lock BraosaOS'}
      </button>
    </div>
  )
}

// ─── Sub-tab: Connections ─────────────────────────────────────────────────────

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

function ConnectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-inset)',
      border: '1px solid var(--edge-soft)',
      borderRadius: 'var(--radius)',
      padding: '16px',
    }}>
      {children}
    </div>
  )
}

function ConnectionsTab() {
  const lang = useLang()
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [spotifyStatus, setSpotifyStatus] = useState<{ connected: boolean; display_name?: string } | null>(null)
  const [banks, setBanks] = useState<{ id: string; institution_name: string; status: string }[]>([])
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetch('/api/google/status').then(r => r.json()).then(setGoogleStatus).catch(() => {})
    fetch('/api/bank/connections').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.connections) setBanks(d.connections)
    }).catch(() => {})
    // Spotify: try to check if there's a spotify connection
    fetch('/api/spotify/status').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setSpotifyStatus(d)
    }).catch(() => { setSpotifyStatus({ connected: false }) })
  }, [])

  async function handleGoogleDisconnect() {
    setDisconnecting(true)
    await fetch('/api/google/disconnect', { method: 'POST' }).catch(() => {})
    setGoogleStatus({ connected: false, email: null, name: null, picture: null, scopes: [] })
    setDisconnecting(false)
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Google */}
      <ConnectionCard>
        <SectionLabel>Google</SectionLabel>
        {!googleStatus ? (
          <SkeletonBars />
        ) : googleStatus.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {googleStatus.picture ? (
                <img src={googleStatus.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-raised-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="user" size={14} />
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {googleStatus.name ?? googleStatus.email}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {googleStatus.email}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pos, #4ade80)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pos, #4ade80)' }}>
                  {lang === 'pt' ? 'Ligado' : 'Connected'}
                </span>
              </div>
            </div>
            {getScopeChips(googleStatus.scopes).length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {getScopeChips(googleStatus.scopes).map(chip => (
                  <span key={chip} style={{
                    padding: '3px 8px', borderRadius: 4,
                    background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
                    fontSize: 11, color: 'var(--ink-dim)', fontFamily: 'var(--font-mono)',
                  }}>{chip}</span>
                ))}
              </div>
            )}
            <button
              className="btn"
              onClick={handleGoogleDisconnect}
              disabled={disconnecting}
              style={{ width: '100%', justifyContent: 'center', height: 44, color: 'var(--neg)' }}
            >
              {lang === 'pt' ? 'Desligar' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
              {lang === 'pt'
                ? 'Liga a tua conta Google para Mail, Calendar, Contacts e Drive.'
                : 'Connect your Google account for Mail, Calendar, Contacts and Drive.'}
            </div>
            <button
              className="btn"
              onClick={() => { window.location.href = '/api/google/connect' }}
              style={{
                width: '100%', justifyContent: 'center', height: 44,
                background: 'color-mix(in oklch, var(--c-mail) 18%, var(--bg-raised))',
                border: '1px solid color-mix(in oklch, var(--c-mail) 40%, transparent)',
                color: 'var(--c-mail)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Icon name="link" size={14} />
              {lang === 'pt' ? 'Ligar Google' : 'Connect Google'}
            </button>
          </div>
        )}
      </ConnectionCard>

      {/* Spotify */}
      <ConnectionCard>
        <SectionLabel>Spotify</SectionLabel>
        {!spotifyStatus ? (
          <SkeletonBars />
        ) : spotifyStatus.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>S</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{spotifyStatus.display_name ?? 'Spotify'}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1DB954' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#1DB954' }}>
                  {lang === 'pt' ? 'Ligado' : 'Connected'}
                </span>
              </div>
            </div>
            <button
              className="btn"
              onClick={() => fetch('/api/spotify/disconnect', { method: 'POST' }).then(() => setSpotifyStatus({ connected: false }))}
              style={{ width: '100%', justifyContent: 'center', height: 44, color: 'var(--neg)' }}
            >
              {lang === 'pt' ? 'Desligar' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
              {lang === 'pt' ? 'Liga o Spotify para controlo de música nos treinos.' : 'Connect Spotify for music control during workouts.'}
            </div>
            <button
              className="btn"
              onClick={() => { window.location.href = '/api/spotify/connect' }}
              style={{
                width: '100%', justifyContent: 'center', height: 44,
                background: 'color-mix(in oklch, #1DB954 18%, var(--bg-raised))',
                border: '1px solid color-mix(in oklch, #1DB954 40%, transparent)',
                color: '#1DB954',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Icon name="link" size={14} />
              {lang === 'pt' ? 'Ligar Spotify' : 'Connect Spotify'}
            </button>
          </div>
        )}
      </ConnectionCard>

      {/* GoCardless / Banks */}
      <ConnectionCard>
        <SectionLabel>{lang === 'pt' ? 'Bancos' : 'Banks'}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {banks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {banks.map(bank => (
                <div key={bank.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: bank.status === 'linked' ? 'var(--pos)' : 'var(--ink-faint)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{bank.institution_name}</span>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn"
            onClick={() => { window.location.href = '/api/bank/connect' }}
            style={{ width: '100%', justifyContent: 'center', height: 44, display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Icon name="plus" size={14} />
            {lang === 'pt' ? '+ Ligar Banco' : '+ Connect Bank'}
          </button>
        </div>
      </ConnectionCard>
    </div>
  )
}

// ─── Sub-tab: Account ─────────────────────────────────────────────────────────

function AccountTab() {
  const lang = useLang()
  const [user, setUser] = useState<OSUser | null>(null)

  useEffect(() => { getUser().then(setUser) }, [])

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Email */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--bg-inset)',
        border: '1px solid var(--edge-soft)',
        borderRadius: 'var(--radius)',
        fontSize: 15, color: 'var(--ink)',
        fontWeight: 500,
      }}>
        {user?.email ?? ''}
      </div>

      {/* Sign out */}
      <button
        className="btn"
        onClick={handleSignOut}
        style={{ width: '100%', justifyContent: 'center', height: 48, color: 'var(--neg)', fontSize: 15 }}
      >
        {lang === 'pt' ? 'Terminar Sessão' : 'Sign Out'}
      </button>

      {/* Danger zone */}
      <div style={{
        background: 'color-mix(in oklch, var(--neg) 8%, var(--bg-inset))',
        border: '1px solid color-mix(in oklch, var(--neg) 20%, transparent)',
        borderRadius: 'var(--radius)',
        padding: '16px',
      }}>
        <div style={{ fontSize: 12, color: 'var(--neg)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          {lang === 'pt' ? 'Zona de Perigo' : 'Danger Zone'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 10 }}>
          {lang === 'pt' ? 'Apagar Conta' : 'Delete Account'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          {lang === 'pt' ? 'Contacta o suporte' : 'Contact support'}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-tab: Versions ────────────────────────────────────────────────────────

function VersionsTab() {
  const lang = useLang()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(v: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
          BraosaOS
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--c-task)', marginTop: 4 }}>
          v{APP_VERSION} · Alpha
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 6 }}>
          {lang === 'pt' ? 'O teu OS pessoal.' : 'Your personal OS.'}
        </div>
      </div>

      {/* Current version card */}
      <div style={{
        background: 'var(--c-task-dim)',
        border: '1px solid var(--c-task)',
        borderRadius: 'var(--radius)',
        padding: '16px 18px',
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--c-task)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
          {lang === 'pt' ? 'VERSÃO ATUAL' : 'CURRENT VERSION'}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
          v{APP_VERSION}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
          Jun 2026
        </div>
      </div>

      {/* Version list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {VERSION_HISTORY.map((item) => {
          const isCurrent = item.version === APP_VERSION
          const isExpanded = expanded.has(item.version)
          return (
            <div
              key={item.version}
              style={{
                borderBottom: '1px solid var(--edge-soft)',
                borderLeft: isCurrent ? '3px solid var(--c-task)' : '3px solid transparent',
                background: isCurrent ? 'color-mix(in oklch, var(--c-task) 4%, transparent)' : 'transparent',
                paddingLeft: isCurrent ? 13 : 0,
              }}
            >
              <div
                onClick={() => toggle(item.version)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 0', cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                    v{item.version}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 2 }}>{item.group}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>
                  {item.date}
                </div>
                <span style={{ color: 'var(--ink-faint)', fontSize: 12, flexShrink: 0 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
              {isExpanded && (
                <div style={{ padding: '8px 0 8px 16px', marginTop: -4 }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {item.entries.map((entry, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7, paddingLeft: 12, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: 'var(--ink-faint)' }}>·</span>
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { activeSubTab } = useContext(MobileSubTabContext)

  function renderSubTab() {
    switch (activeSubTab) {
      case 'appearance':  return <AppearanceTab />
      case 'security':    return <SecurityTab />
      case 'connections': return <ConnectionsTab />
      case 'account':     return <AccountTab />
      case 'version':     return <VersionsTab />
      default:            return <ProfileTab />
    }
  }

  return (
    <div style={{ flex: 1, background: 'var(--bg)', overflowY: 'auto', minHeight: 0 }}>
      {renderSubTab()}
    </div>
  )
}

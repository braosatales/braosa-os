'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'
import Ring from './Ring'
import { SYSTEMS, COMPANIES, USER } from '@/lib/data'

interface TopNavProps {
  onLock: () => void
}

export default function TopNav({ onLock }: TopNavProps) {
  const pathname = usePathname()

  return (
    <header style={{
      position: 'fixed', top: 0, width: '100%', height: 62, zIndex: 50,
      background: 'linear-gradient(180deg, var(--bg-raised) 0%, var(--bg-void) 100%)',
      borderBottom: '1px solid var(--edge-soft)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8,
    }}>
      {/* Cog */}
      <button
        className="cogbtn"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--ink-faint)', padding: 6, borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Settings"
      >
        <Icon name="cog" size={17} />
      </button>

      {/* System tabs */}
      <div className="navtabs" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {SYSTEMS.map(sys => {
          const active = pathname.startsWith(`/${sys.id}`)
          return (
            <Link
              key={sys.id}
              href={`/${sys.id}`}
              className="navtab"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 11px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                textDecoration: 'none',
                fontSize: 13, fontWeight: 500,
                transition: 'all .15s ease',
                color: active ? sys.color : 'var(--ink-dim)',
                borderColor: active ? sys.color : 'transparent',
                background: active ? sys.dim : 'transparent',
                boxShadow: active ? `0 0 calc(26px * var(--glow)) -6px ${sys.color}` : 'none',
              }}
            >
              <Icon name={sys.glyph} size={15} />
              <span className="navtab-label">{sys.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Right section */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Company tabs */}
        {COMPANIES.map(co => {
          const active = pathname.startsWith(`/${co.id}`)
          return (
            <Link
              key={co.id}
              href={`/${co.id}`}
              className="companytab"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 9px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                textDecoration: 'none',
                fontSize: 13, fontWeight: 500,
                transition: 'all .15s ease',
                color: active ? co.color : 'var(--ink-faint)',
                borderColor: active ? co.dim : 'transparent',
              }}
            >
              <Icon name={co.glyph} size={14} />
              <span className="companytab-label">{co.label}</span>
            </Link>
          )
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--edge)' }} />

        {/* Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="flame" size={14} style={{ color: 'var(--c-health)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{USER.streak}</span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--edge)' }} />

        {/* Level ring + life score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ring value={USER.xpToNext} color="var(--c-fin)" size={34} stroke={3.5} label={`L${USER.level}`} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Life Score
            </span>
            <span className="lifescore-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
              {USER.lifeScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--edge)' }} />

        {/* Lock */}
        <button
          onClick={onLock}
          className="lockbtn"
          style={{
            background: 'none', cursor: 'pointer',
            color: 'var(--ink-faint)',
            border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 8px',
            display: 'flex', alignItems: 'center',
            transition: 'all .15s ease',
          }}
          aria-label="Lock"
        >
          <Icon name="lock" size={16} />
        </button>
      </div>
    </header>
  )
}

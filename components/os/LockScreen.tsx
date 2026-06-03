'use client'

import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'

interface LockScreenProps {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('')
  const [shaking, setShaking] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 720px)').matches)
    inputRef.current?.focus()
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false }))
      setDate(now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  function attempt() {
    if (password === 'admin') {
      onUnlock()
    } else {
      setShaking(true)
      setPassword('')
      setTimeout(() => setShaking(false), 420)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') attempt()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'oklch(0 0 0 / 0.55)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div
        className={shaking ? 'lock-shake' : ''}
        style={{
          width: `min(420px, 90vw)`,
          background: 'var(--bg-raised)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--radius-lg)',
          padding: 48,
          boxShadow: 'var(--shadow-pop)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          animation: 'pop-in 0.28s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'oklch(0.30 0.007 72)',
          border: '1px solid var(--edge)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-faint)',
        }}>
          <Icon name="lock" size={22} stroke={1.5} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700,
            color: 'var(--ink)', letterSpacing: '-0.01em',
          }}>
            Braosa OS
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 38, fontWeight: 700,
            color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 8,
            lineHeight: 1,
          }}>
            {time}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 6 }}>
            {date}
          </div>
        </div>

        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="············"
          className="glow-focus"
          style={{
            width: '100%',
            background: 'var(--bg-inset)',
            border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--ink)',
            fontSize: 16,
            padding: '11px 16px',
            textAlign: 'center',
            letterSpacing: '0.12em',
            fontFamily: 'var(--mono)',
            '--accent': 'var(--c-fin)',
          } as React.CSSProperties}
        />

        {isMobile && (
          <button
            onClick={attempt}
            className="btn btn-accent"
            style={{ width: '100%', justifyContent: 'center', '--accent': 'var(--c-fin)' } as React.CSSProperties}
          >
            Unlock
          </button>
        )}

        <div style={{
          fontSize: 11, color: 'var(--ink-faint)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginTop: 4,
        }}>
          {isMobile ? 'Tap unlock to enter' : 'Press enter to enter'}
        </div>
      </div>
    </div>
  )
}

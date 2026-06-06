'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDeviceTrusted, setDeviceTrusted } from '@/lib/deviceTrust'
import Icon from '@/components/os/Icon'

type Mode = 'loading' | 'login' | 'mfa' | 'enroll' | 'unlock'

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [mode, setMode] = useState<Mode>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [lockPw, setLockPw] = useState('')
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [ok, setOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches

  const now = new Date()
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session && isDeviceTrusted()) {
        setMode('unlock')
      } else if (session) {
        await supabase.auth.signOut()
        setMode('login')
      } else {
        setMode('login')
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (mode !== 'loading') setTimeout(() => inputRef.current?.focus(), 350)
  }, [mode])

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 420) }

  const handleUnlock = async () => {
    if (!lockPw) { triggerShake(); return }
    setLoading(true); setError('')
    const res = await fetch('/api/user/lock-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: lockPw }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) { setOk(true); setTimeout(onUnlock, 500) }
    else { setError('Wrong password'); setLockPw(''); triggerShake() }
  }

  const handleLogin = async () => {
    if (!email || !password) { triggerShake(); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!data.ok) { setError(data.error || 'Login failed'); triggerShake(); return }
    await fetch('/api/user/upsert', { method: 'POST' })
    if (data.requiresMFA) {
      const supabase = createClient()
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const factor = factors?.totp?.[0]
      if (factor) { setFactorId(factor.id); setMode('mfa') }
    } else {
      const enrollRes = await fetch('/api/auth/mfa-enroll', { method: 'POST' })
      const enrollData = await enrollRes.json()
      if (enrollData.factorId) {
        setFactorId(enrollData.factorId); setQrCode(enrollData.qrCode)
        setSecret(enrollData.secret); setMode('enroll')
      } else { setError('Could not start MFA enrollment') }
    }
  }

  const handleMFA = async () => {
    if (totp.length !== 6) { triggerShake(); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/mfa-verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId, code: totp }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setDeviceTrusted(); await fetch('/api/user/upsert', { method: 'POST' })
      setOk(true); setTimeout(onUnlock, 500)
    } else { setError('Invalid code — try again'); setTotp(''); triggerShake() }
  }

  const handleEnrollVerify = async () => {
    if (totp.length !== 6) { triggerShake(); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/mfa-verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId, code: totp }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) { setDeviceTrusted(); setOk(true); setTimeout(onUnlock, 500) }
    else { setError('Invalid code — check your authenticator and try again'); setTotp(''); triggerShake() }
  }

  if (mode === 'loading') return null

  const cardStyle: React.CSSProperties = {
    position: 'relative', width: 'min(420px, 90vw)', padding: '44px 40px 38px',
    background: 'linear-gradient(180deg, oklch(0.27 0.009 72 / 0.97), oklch(0.215 0.007 70 / 0.98))',
    border: '1px solid var(--edge-strong)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-pop), 0 1px 0 oklch(0.85 0.01 80 / 0.08) inset',
    textAlign: 'center',
    animation: ok ? 'lock-zoom .5s forwards' : 'pop-in .55s cubic-bezier(.2,.9,.25,1.05)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', textAlign: 'center', fontFamily: 'var(--body)', fontSize: 16,
    color: 'var(--ink)', background: 'oklch(0.16 0.006 70 / 0.6)',
    border: '1px solid var(--edge)', borderBottom: '1.5px solid var(--edge-strong)',
    borderRadius: 'var(--radius-sm)', padding: '13px 16px', outline: 'none',
  }

  const renderLockIcon = () => (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center',
        background: 'var(--c-dash-dim)', border: '1px solid var(--edge)', color: 'var(--c-dash)',
        boxShadow: '0 0 calc(28px * var(--glow)) -6px var(--c-dash)' }}>
        <Icon name="lock" size={22} />
      </div>
    </div>
  )

  const renderTitle = () => (
    <>
      <div style={{ fontFamily: 'var(--display)', fontSize: 33, fontWeight: 600,
        letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>Braosa OS</div>
      <div className="mono" style={{ fontSize: 11.5, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 12 }}>
        {time} · {date}
      </div>
    </>
  )

  const renderError = () => error ? (
    <div style={{ fontSize: 12.5, color: 'var(--neg)', marginTop: 10, textAlign: 'center' }}>{error}</div>
  ) : null

  const backdrop = (
    <div style={{ position: 'absolute', inset: 0,
      background: 'radial-gradient(120% 90% at 50% 35%, oklch(0.18 0.01 70 / 0.55), oklch(0.12 0.006 70 / 0.85))' }} />
  )

  const btnAccentStyle: React.CSSProperties = {
    marginTop: 16, width: '100%', justifyContent: 'center',
    ['--accent' as string]: 'var(--c-dash)', color: 'oklch(0.18 0.01 80)'
  }

  const hint = (text: string) => (
    <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.14em',
      color: 'var(--ink-faint)', marginTop: 22, opacity: 0.7 }}>{text}</div>
  )

  if (mode === 'login') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', animation: 'fade-in .4s ease' }}>
      {backdrop}
      <div className={shake ? 'lock-shake' : ''} style={cardStyle}>
        {renderLockIcon()}{renderTitle()}
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input ref={inputRef} type="email" value={email} placeholder="your@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('pw-input')?.focus()}
            className="glow-focus" style={{ ...inputStyle, textAlign: 'left', letterSpacing: '0.01em', ['--accent' as string]: 'var(--c-dash)' }} />
          <input id="pw-input" type="password" value={password} placeholder="Password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="glow-focus" style={{ ...inputStyle, textAlign: 'left', letterSpacing: password ? '0.3em' : '0.01em', ['--accent' as string]: 'var(--c-dash)' }} />
        </div>
        {renderError()}
        <button className="btn btn-accent" disabled={loading} onClick={handleLogin} style={btnAccentStyle}>
          {loading ? 'Signing in…' : 'Sign in'} <Icon name="arrow" size={16} />
        </button>
        {hint('ENTER YOUR CREDENTIALS')}
      </div>
    </div>
  )

  if (mode === 'mfa') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', animation: 'fade-in .4s ease' }}>
      {backdrop}
      <div className={shake ? 'lock-shake' : ''} style={cardStyle}>
        {renderLockIcon()}{renderTitle()}
        <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 16, lineHeight: 1.5 }}>
          Enter the 6-digit code from your authenticator app.
        </p>
        <div style={{ marginTop: 20 }}>
          <input ref={inputRef} type="text" inputMode="numeric" maxLength={6}
            value={totp} placeholder="000000"
            onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleMFA()}
            className="glow-focus" style={{ ...inputStyle, letterSpacing: '0.4em', fontSize: 22, ['--accent' as string]: 'var(--c-dash)' }} />
        </div>
        {renderError()}
        <button className="btn btn-accent" disabled={loading} onClick={handleMFA} style={btnAccentStyle}>
          {loading ? 'Verifying…' : 'Verify'} <Icon name="arrow" size={16} />
        </button>
        {hint('CHECK YOUR AUTHENTICATOR APP')}
      </div>
    </div>
  )

  if (mode === 'enroll') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', animation: 'fade-in .4s ease' }}>
      {backdrop}
      <div style={{ ...cardStyle, width: 'min(480px, 92vw)' }}>
        {renderLockIcon()}{renderTitle()}
        <p style={{ fontSize: 13.5, color: 'var(--ink-dim)', marginTop: 16, lineHeight: 1.5 }}>
          Scan this QR code with <strong style={{ color: 'var(--ink-soft)' }}>Google Authenticator</strong> or <strong style={{ color: 'var(--ink-soft)' }}>Authy</strong>, then enter the 6-digit code to confirm.
        </p>
        {qrCode && (
          <div style={{ margin: '20px auto', padding: 12, background: 'white', borderRadius: 12, display: 'inline-block' }}>
            <img src={qrCode} alt="QR code" style={{ width: 160, height: 160, display: 'block' }} />
          </div>
        )}
        {secret && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', background: 'var(--bg-inset)', borderRadius: 8, padding: '6px 12px', marginBottom: 16, letterSpacing: '0.12em' }}>
            {secret}
          </div>
        )}
        <input ref={inputRef} type="text" inputMode="numeric" maxLength={6}
          value={totp} placeholder="000000"
          onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleEnrollVerify()}
          className="glow-focus" style={{ ...inputStyle, letterSpacing: '0.4em', fontSize: 22, ['--accent' as string]: 'var(--c-dash)' }} />
        {renderError()}
        <button className="btn btn-accent" disabled={loading} onClick={handleEnrollVerify} style={btnAccentStyle}>
          {loading ? 'Confirming…' : 'Confirm & unlock'} <Icon name="arrow" size={16} />
        </button>
        {hint('THIS DEVICE WILL BE TRUSTED FOR 30 DAYS')}
      </div>
    </div>
  )

  // MODE D — Idle unlock
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', animation: ok ? 'fade-out .5s forwards' : 'fade-in .4s ease' }}>
      {backdrop}
      <div className={shake ? 'lock-shake' : ''} style={cardStyle}>
        {renderLockIcon()}{renderTitle()}
        <div style={{ marginTop: 30 }}>
          <input ref={inputRef} type="password" value={lockPw} placeholder="············"
            onChange={e => setLockPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            className="glow-focus" style={{ ...inputStyle, letterSpacing: lockPw ? '0.3em' : '0.02em', ['--accent' as string]: 'var(--c-dash)' }} />
        </div>
        {renderError()}
        {isMobile && (
          <button className="btn btn-accent" disabled={loading} onClick={handleUnlock} style={btnAccentStyle}>
            {loading ? '…' : 'Unlock'} <Icon name="arrow" size={16} />
          </button>
        )}
        {hint(isMobile ? 'TAP UNLOCK TO ENTER' : 'PRESS ENTER TO ENTER')}
      </div>
    </div>
  )
}

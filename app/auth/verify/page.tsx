'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyContent() {
  const router = useRouter()
  const factorId = useSearchParams().get('factorId') ?? ''
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleVerify = async (overrideCode?: string) => {
    const c = overrideCode ?? code
    if (c.length !== 6 || loading) return
    setLoading(true)
    setShake(false)
    try {
      const r = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, factorId }),
      })
      if (r.ok) {
        router.push('/dashboard')
      } else {
        setShake(true)
        setCode('')
        setError('Código inválido. Tenta novamente.')
        setTimeout(() => setShake(false), 600)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        background: 'radial-gradient(120% 100% at 50% 0%, oklch(0.205 0.007 70), var(--bg-void))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow 1 */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          top: '-20%',
          left: '-20%',
          background: 'radial-gradient(circle, oklch(0.70 0.125 292 / 0.06), transparent 70%)',
          borderRadius: '99%',
          pointerEvents: 'none',
          animation: 'rise-soft 8s ease-in-out infinite alternate',
        }}
      />
      {/* Glow 2 */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          bottom: '-20%',
          right: '-20%',
          background: 'radial-gradient(circle, oklch(0.70 0.125 292 / 0.04), transparent 70%)',
          borderRadius: '99%',
          pointerEvents: 'none',
          animation: 'rise-soft 12s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'var(--bg-raised)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 44px',
          width: 400,
          boxShadow: 'var(--shadow-pop)',
          animation: shake
            ? 'lock-shake 0.6s ease-in-out'
            : 'pop-in .3s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        {/* System label */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--ink-faint)',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          BRAOSA OS
        </div>

        {/* Logo mark */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '99%',
            margin: '0 auto 20px',
            background: 'color-mix(in oklch, var(--c-task) 16%, transparent)',
            border: '1px solid color-mix(in oklch, var(--c-task) 30%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--c-task)',
            }}
          >
            B
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ink)',
            textAlign: 'center',
          }}
        >
          Verificação em dois passos
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-dim)',
            textAlign: 'center',
            marginTop: 6,
            marginBottom: 28,
          }}
        >
          Abre a tua app de autenticação.
        </div>

        {/* Code input */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            autoFocus
            className="glow-focus"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(v)
              if (v.length === 6) handleVerify(v)
            }}
            style={{
              fontSize: 24,
              letterSpacing: '0.3em',
              textAlign: 'center',
              maxWidth: 200,
              width: '100%',
              background: 'var(--bg-inset)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              color: 'var(--ink)',
              outline: 'none',
              boxSizing: 'border-box',
              '--accent': 'var(--c-task)',
            } as React.CSSProperties}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--neg)',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={() => handleVerify()}
          disabled={loading || code.length < 6}
          className="btn btn-accent"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer',
            opacity: loading || code.length < 6 ? 0.5 : 1,
            '--accent': 'var(--c-task)',
          } as React.CSSProperties}
        >
          {loading ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block', animation: 'pulse 1s ease-in-out 0s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block', animation: 'pulse 1s ease-in-out 0.2s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block', animation: 'pulse 1s ease-in-out 0.4s infinite' }} />
            </>
          ) : (
            'Verificar'
          )}
        </button>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a
            href="/login"
            style={{
              fontSize: 12,
              color: 'var(--ink-faint)',
              textDecoration: 'none',
            }}
          >
            ← Voltar ao login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-void)' }}>
        <div style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.16em' }}>
          A carregar…
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}

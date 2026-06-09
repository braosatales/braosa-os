'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
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
          animation: 'pop-in .3s cubic-bezier(.2,.8,.2,1) both',
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
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--ink)',
            textAlign: 'center',
          }}
        >
          Bem-vindo de volta.
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-dim)',
            textAlign: 'center',
            marginTop: 6,
            marginBottom: 32,
          }}
        >
          O teu OS pessoal.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glow-focus"
            style={{
              width: '100%',
              background: 'var(--bg-inset)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)',
              padding: '11px 14px',
              fontSize: 14,
              color: 'var(--ink)',
              outline: 'none',
              boxSizing: 'border-box',
              '--accent': 'var(--c-task)',
            } as React.CSSProperties}
          />
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="glow-focus"
            style={{
              width: '100%',
              background: 'var(--bg-inset)',
              border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)',
              padding: '11px 14px',
              fontSize: 14,
              color: 'var(--ink)',
              outline: 'none',
              boxSizing: 'border-box',
              '--accent': 'var(--c-task)',
            } as React.CSSProperties}
          />

          {error && (
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--neg)',
                textAlign: 'center',
                marginTop: -4,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'var(--c-task)',
              color: 'oklch(0.18 0.01 80)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block', animation: 'pulse 1s ease-in-out 0s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block', animation: 'pulse 1s ease-in-out 0.2s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block', animation: 'pulse 1s ease-in-out 0.4s infinite' }} />
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--ink-faint)',
            textAlign: 'center',
            marginTop: 28,
          }}
        >
          BraosaOS · Acesso privado
        </div>
      </div>
    </div>
  )
}

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
        background: 'var(--bg-void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--radius-lg)',
          padding: 40,
          width: '100%',
          maxWidth: 380,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 28,
            textAlign: 'center',
          }}
        >
          BraosaOS
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glow-focus"
            style={{ '--accent': 'var(--c-task)' } as React.CSSProperties}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="glow-focus"
            style={{ '--accent': 'var(--c-task)' } as React.CSSProperties}
          />

          {error && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--neg)',
                padding: '8px 12px',
                background: 'color-mix(in oklch, var(--neg) 10%, transparent)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid color-mix(in oklch, var(--neg) 25%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{
              '--accent': 'var(--c-task)',
              marginTop: 4,
              opacity: loading ? 0.6 : 1,
            } as React.CSSProperties}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

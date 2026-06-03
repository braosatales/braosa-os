'use client'

import Icon from '@/components/os/Icon'

export default function VerumPage() {
  return (
    <div style={{
      paddingTop: 62, height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'radial-gradient(120% 100% at 50% 0%, oklch(0.205 0.007 70), var(--bg-void))',
    }}>
      <Icon name="shield" size={48} stroke={1.2} style={{ color: 'var(--c-verum)', opacity: 0.7 }} />
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--c-verum)' }}>Verum</h1>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>STANDING BY</span>
    </div>
  )
}

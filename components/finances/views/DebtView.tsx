'use client'
import { Icon } from '@/components/ui'

export default function DebtView() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
      <span style={{ color: 'var(--neg)', opacity: 0.6, display: 'flex' }}>
        <Icon name="trending-down" size={28} />
      </span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>Dívidas</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--ink-faint)' }}>COMING ONLINE · NEXT DISPATCH</div>
    </div>
  )
}

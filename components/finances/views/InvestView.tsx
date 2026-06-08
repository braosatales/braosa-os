'use client'
import { Icon } from '@/components/ui'

export default function InvestView() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
      <span style={{ color: 'var(--pos)', opacity: 0.6, display: 'flex' }}>
        <Icon name="trending-up" size={28} />
      </span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>Investimentos</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--ink-faint)' }}>COMING ONLINE · NEXT DISPATCH</div>
    </div>
  )
}

'use client'
import { Icon } from '@/components/ui'

export default function OverviewView() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
      <span style={{ color: 'var(--c-health)', opacity: 0.6 }}><Icon name="activity" size={32} /></span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Overview</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--ink-faint)' }}>COMING ONLINE · NEXT DISPATCH</div>
    </div>
  )
}

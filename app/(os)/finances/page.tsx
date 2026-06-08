'use client'
import FinancesShell from '@/components/finances/FinancesShell'

export default function FinancesPage() {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FinancesShell />
    </div>
  )
}

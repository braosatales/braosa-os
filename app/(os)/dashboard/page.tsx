'use client'
import { useNavigation } from '../layout'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import DashboardGrid from '@/components/dashboard/DashboardGrid'

export default function DashboardPage() {
  const { navigate } = useNavigation()
  const isMobile = useIsMobile()
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <DashboardGrid device={isMobile ? 'mobile' : 'desktop'} onNavigate={navigate} />
    </div>
  )
}

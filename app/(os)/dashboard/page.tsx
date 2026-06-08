'use client'
import { useNavigation } from '../layout'
import DashboardGrid from '@/components/dashboard/DashboardGrid'

export default function DashboardPage() {
  const { navigate } = useNavigation()
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <DashboardGrid onNavigate={navigate} />
    </div>
  )
}

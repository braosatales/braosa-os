import { createContext, useState, useEffect, useCallback } from 'react'

export type NotificationCounts = {
  mail: number
  contacts: number
  tasks: number
  calendar: number
  health: boolean
  nutrition: boolean
  verum: boolean
}

const EMPTY: NotificationCounts = {
  mail: 0, contacts: 0, tasks: 0, calendar: 0,
  health: false, nutrition: false, verum: false,
}

export async function fetchNotifications(): Promise<NotificationCounts> {
  try {
    const res = await fetch('/api/notifications')
    if (!res.ok) return EMPTY
    return await res.json()
  } catch {
    return EMPTY
  }
}

export function useNotifications(): {
  counts: NotificationCounts | null
  loading: boolean
  refetch: () => void
} {
  const [counts, setCounts] = useState<NotificationCounts | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    fetchNotifications().then(data => {
      setCounts(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    refetch()
    const interval = setInterval(refetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refetch])

  return { counts, loading, refetch }
}

export const NotificationsContext = createContext<{
  counts: NotificationCounts | null
  refetch: () => void
}>({ counts: null, refetch: () => {} })

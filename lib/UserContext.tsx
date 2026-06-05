'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OsUser } from '@/lib/types'

type UserContextType = {
  user: OsUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OsUser | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setUser(null); setLoading(false); return }
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', authUser.id)
      .single()
    setUser(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <UserContext.Provider value={{ user, loading, refresh: load }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)

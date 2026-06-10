import { createContext } from 'react'

export const MobileSubTabContext = createContext<{
  activeSubTab: string
  setSubTab: (id: string) => void
}>({ activeSubTab: '', setSubTab: () => {} })

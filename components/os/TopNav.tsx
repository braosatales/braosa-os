'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Flame, Lock } from 'lucide-react'

const tabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Finances', href: '/finances' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Email', href: '/email' },
  { label: 'Braosa', href: '/braosa' },
  { label: 'Verum', href: '/verum' },
]

export default function TopNav() {
  const pathname = usePathname()

  function handleLock() {
    window.dispatchEvent(new CustomEvent('braosa:lock'))
  }

  return (
    <header className="fixed top-0 w-full h-12 bg-[#111117] border-b border-[#1E1E2A] z-50 flex items-center px-4 gap-2">
      <Sun size={16} className="text-[#505065] shrink-0" />
      <nav className="flex items-center gap-1">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? 'bg-white text-[#0D0D0F] rounded-full px-3 py-1 text-sm font-medium'
                  : 'text-[#A0A0B5] text-sm px-3 py-1 hover:text-[#F0F0F5] transition-colors'
              }
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Flame size={16} className="text-[#C4614A]" />
          <span className="text-[#F0F0F5] text-sm font-semibold">23</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-[#D4A84B] flex items-center justify-center">
            <span className="text-xs font-bold text-[#F0F0F5]">14</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-[#F0F0F5]">7420</span>
            <span className="text-[10px] text-[#505065]">LIFE SCORE</span>
          </div>
        </div>
        <button onClick={handleLock} className="text-[#505065] hover:text-[#F0F0F5] transition-colors">
          <Lock size={16} />
        </button>
      </div>
    </header>
  )
}

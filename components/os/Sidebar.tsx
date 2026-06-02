'use client'

import { useState } from 'react'
import {
  CalendarDays, Grid2X2, Columns, FolderOpen, Repeat, Star, Sparkles,
  LayoutDashboard, Wallet, Building2, CreditCard, TrendingUp, Baby, Calculator,
  Inbox, Send, Archive, Tag,
  Dumbbell, Apple, Moon, BookOpen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
}

const sidebarConfig: Record<string, NavItem[]> = {
  tasks: [
    { icon: CalendarDays, label: 'Today' },
    { icon: Grid2X2, label: 'Matrix' },
    { icon: Columns, label: 'Board' },
    { icon: FolderOpen, label: 'Projects' },
    { icon: Repeat, label: 'Habits' },
    { icon: Star, label: 'Someday' },
    { icon: Sparkles, label: 'Braosa AI' },
  ],
  finances: [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: Wallet, label: 'Budget' },
    { icon: Building2, label: 'Accounts' },
    { icon: CreditCard, label: 'Debt' },
    { icon: TrendingUp, label: 'Investments' },
    { icon: Baby, label: 'Baby Steps' },
    { icon: Calculator, label: 'Calculators' },
    { icon: Sparkles, label: 'Braosa AI' },
  ],
  email: [
    { icon: Inbox, label: 'Inbox' },
    { icon: Send, label: 'Sent' },
    { icon: Archive, label: 'Archive' },
    { icon: Tag, label: 'Labels' },
    { icon: Sparkles, label: 'Braosa AI' },
  ],
  braosa: [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: Sparkles, label: 'Braosa AI' },
  ],
  verum: [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: Sparkles, label: 'Braosa AI' },
  ],
  health: [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: Dumbbell, label: 'Exercise' },
    { icon: Apple, label: 'Meals' },
    { icon: Moon, label: 'Sleep' },
    { icon: BookOpen, label: 'Rituals' },
    { icon: Sparkles, label: 'Braosa AI' },
  ],
}

interface SidebarProps {
  system: string
  activeItem?: string
}

export default function Sidebar({ system, activeItem }: SidebarProps) {
  const [aiVisible, setAiVisible] = useState(true)
  const items = sidebarConfig[system] ?? []

  return (
    <aside className="fixed left-0 top-12 w-[185px] h-[calc(100vh-48px)] bg-[#111117] border-r border-[#1E1E2A] flex flex-col justify-between">
      <div className="pt-5">
        <p className="os-label px-4 pb-3 capitalize">{system}</p>
        <ul>
          {items.map(({ icon: Icon, label }) => {
            const active = activeItem === label
            return (
              <li key={label}>
                <button
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 mx-2 rounded-lg text-sm transition-colors${
                    active
                      ? ' sidebar-pill'
                      : ' text-[#A0A0B5] hover:text-[#F0F0F5] hover:bg-[#161620]'
                  }`}
                  style={{ width: 'calc(100% - 16px)' }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <button
        onClick={() => setAiVisible(v => !v)}
        className="bg-[#161620] border border-[#1E1E2A] rounded-lg mx-3 mb-4 px-3 py-2 text-sm text-[#505065] hover:text-[#F0F0F5] flex items-center gap-2 transition-colors"
      >
        <Sparkles size={14} />
        {aiVisible ? 'Hide AI' : 'Show AI'}
      </button>
    </aside>
  )
}

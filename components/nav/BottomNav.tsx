'use client'
import { Icon } from '@/components/ui'
import { SYSTEMS, COMPANIES } from '@/lib/constants'
import { useNavigation } from '@/app/(os)/layout'

const ALL_TABS = [...SYSTEMS, ...COMPANIES]

export default function BottomNav() {
  const { active, navigate } = useNavigation()

  return (
    <nav
      className="mobile-only hide-scrollbar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 'calc(64px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(0deg, oklch(0.19 0.006 70 / 0.97), oklch(0.19 0.006 70 / 0.92))',
        borderTop: '1px solid var(--edge)',
        backdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {ALL_TABS.map((s) => {
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => navigate(s.id)}
            style={{
              flexShrink: 0,
              minWidth: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 12px',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: isActive ? s.color : 'var(--ink-faint)',
            }}
          >
            <Icon name={s.icon as Parameters<typeof Icon>[0]['name']} size={20} />
            <span
              style={{
                fontSize: 9.5,
                letterSpacing: '0.04em',
                fontWeight: 500,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 56,
              }}
            >
              {s.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

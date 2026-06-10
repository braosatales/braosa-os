'use client'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui'
import { useLang } from '@/lib/i18n'
import type { MobileApp } from '@/lib/mobile-apps'

interface Props {
  appId: string
  app: MobileApp
  subTabId: string
  onSubTabChange: (id: string) => void
  onClose: () => void
  children: React.ReactNode
}

export default function MobileAppContainer({ app, subTabId, onSubTabChange, onClose, children }: Props) {
  const lang = useLang()
  const [isClosing, setIsClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  const handleClose = () => {
    setIsClosing(true)
    closeTimer.current = setTimeout(onClose, 280)
  }

  const hasSubTabs = (app.subTabs?.length ?? 0) > 0
  const appLabel = lang === 'pt' ? app.label_pt : app.label_en

  return (
    <div
      className={isClosing ? 'app-close' : 'app-open'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
      }}
    >
      {/* Top bar */}
      <div style={{
        flexShrink: 0,
        height: `calc(52px + env(safe-area-inset-top))`,
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 8,
        background: `color-mix(in oklch, ${app.color} 8%, var(--bg-raised))`,
        borderBottom: '1px solid var(--edge-soft)',
      }}>
        {/* Back button */}
        <button
          onClick={handleClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            border: 'none', background: 'transparent', cursor: 'pointer',
            padding: '6px 4px', minWidth: 60,
          }}
        >
          <span style={{ color: 'var(--ink-dim)' }}>
            <Icon name="chevron-left" size={20} />
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-dim)', fontWeight: 500 }}>
            {lang === 'pt' ? 'Início' : 'Home'}
          </span>
        </button>

        {/* App name */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
          color: app.color,
        }}>
          {appLabel}
        </div>

        {/* Right spacer */}
        <div style={{ minWidth: 60 }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: hasSubTabs ? 'calc(56px + env(safe-area-inset-bottom))' : undefined,
      }}>
        {children}
      </div>

      {/* Per-app bottom nav */}
      {hasSubTabs && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'var(--bg-raised)',
          borderTop: '1px solid var(--edge)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          zIndex: 10,
        }}>
          {app.subTabs!.map(tab => {
            const isActive = subTabId === tab.id
            const tabLabel = lang === 'pt' ? tab.label_pt : tab.label_en
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: isActive ? app.color : 'var(--ink-faint)',
                }}
              >
                <Icon name={tab.glyph as any} size={20} />
                <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.04em' }}>
                  {tabLabel}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

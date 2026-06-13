'use client'
import { useState, useEffect, useRef, useContext } from 'react'
import { Icon } from '@/components/ui'
import { useLang } from '@/lib/i18n'
import type { MobileApp } from '@/lib/mobile-apps'
import { NotificationsContext } from '@/lib/notifications'

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
  const [longPressTab, setLongPressTab] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { refetch } = useContext(NotificationsContext)

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  const handleClose = () => {
    setIsClosing(true)
    refetch()
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
        background: '#0F1117',
        borderBottom: '1px solid #2A2D3A',
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
          <span style={{ color: '#8B909E' }}>
            <Icon name="chevron-left" size={20} />
          </span>
          <span style={{ fontSize: 13, color: '#8B909E', fontWeight: 500 }}>
            {lang === 'pt' ? 'Início' : 'Home'}
          </span>
        </button>

        {/* App name */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 15,
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
        background: '#0F1117',
        paddingBottom: hasSubTabs ? 'calc(48px + env(safe-area-inset-bottom) + 8px)' : undefined,
      }}>
        {children}
      </div>

      {/* Per-app bottom nav */}
      {hasSubTabs && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#0F1117',
            borderTop: '1px solid #2A2D3A',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
          {longPressTab && (() => {
            const tab = app.subTabs?.find(t => t.id === longPressTab)
            if (!tab) return null
            return (
              <div
                style={{
                  position: 'absolute', bottom: 'calc(48px + env(safe-area-inset-bottom) + 8px)', left: 0, right: 0,
                  display: 'flex', justifyContent: 'center',
                  zIndex: 200,
                }}
                onClick={() => setLongPressTab(null)}
              >
                <div
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--edge)',
                    borderTop: `3px solid ${app.color}`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    minWidth: 200,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 10 }}>
                    {tab.label_en}
                  </div>
                  <button
                    className="btn"
                    style={{ background: app.color, color: '#fff', width: '100%', minHeight: 40 }}
                    onClick={() => {
                      const shortcut = {
                        id: `${app.id}_${tab.id}`,
                        appId: app.id,
                        subTabId: tab.id,
                        label_pt: tab.label_pt,
                        label_en: tab.label_en,
                        color: app.color,
                        glyph: tab.glyph,
                      }
                      const saved = JSON.parse(localStorage.getItem('braosa-shortcuts') || '[]')
                      if (!saved.find((s: { id: string }) => s.id === shortcut.id)) {
                        const updated = [...saved, shortcut]
                        localStorage.setItem('braosa-shortcuts', JSON.stringify(updated))
                      }
                      setLongPressTab(null)
                    }}
                  >
                    + Add to Home Screen
                  </button>
                </div>
              </div>
            )
          })()}

          <div style={{ height: 48, display: 'flex' }}>
            {app.subTabs!.map(tab => {
              const isActive = subTabId === tab.id
              const tabLabel = lang === 'pt' ? tab.label_pt : tab.label_en
              return (
                <button
                  key={tab.id}
                  onClick={() => { setLongPressTab(null); onSubTabChange(tab.id) }}
                  onPointerDown={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current)
                    longPressTimer.current = setTimeout(() => setLongPressTab(tab.id), 500)
                  }}
                  onPointerUp={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current)
                  }}
                  onPointerLeave={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current)
                  }}
                  style={{
                    flex: 1,
                    height: 48,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: isActive ? app.color : '#555968',
                  }}
                >
                  <Icon name={tab.glyph as any} size={20} />
                  <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.03em' }}>
                    {tabLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

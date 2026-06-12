'use client'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui'
import { MOBILE_APPS, type MobileApp } from '@/lib/mobile-apps'
import { useLang } from '@/lib/i18n'
import { AppIcon } from './AppIcon'
import {
  IconDashboard, IconFinances, IconTasks, IconNotes, IconHealth,
  IconNutrition, IconMail, IconCalendar, IconContacts, IconDrive,
  IconAI, IconBraosa, IconVerum, IconSettings,
} from './AppIcons'

const APP_ICON_MAP: Record<string, React.ComponentType> = {
  dashboard: IconDashboard,
  finances:  IconFinances,
  tasks:     IconTasks,
  notes:     IconNotes,
  health:    IconHealth,
  nutrition: IconNutrition,
  mail:      IconMail,
  calendar:  IconCalendar,
  contacts:  IconContacts,
  drive:     IconDrive,
  ai:        IconAI,
  braosa:    IconBraosa,
  verum:     IconVerum,
  settings:  IconSettings,
}

type Shortcut = {
  id: string
  appId: string
  subTabId: string
  label_pt: string
  label_en: string
  color: string
  glyph: string
}

function useGreeting() {
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Bom dia, João! ☀️' : hour < 18 ? 'Boa tarde, João! 🌤️' : 'Boa noite, João! 🌙')
  }, [])
  return greeting
}

const HIDDEN_APPS_KEY = 'braosa-hidden-apps'

function getHiddenApps(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HIDDEN_APPS_KEY) ?? '[]') } catch { return [] }
}

function setHiddenApps(ids: string[]) {
  localStorage.setItem(HIDDEN_APPS_KEY, JSON.stringify(ids))
}

interface Props {
  onOpenApp: (appId: string, subTabId?: string) => void
}

export default function MobileHomeScreen({ onOpenApp }: Props) {
  const lang = useLang()
  const greeting = useGreeting()
  const [now, setNow] = useState(new Date())
  const [editMode, setEditMode] = useState(false)
  const [pressedApp, setPressedApp] = useState<string | null>(null)
  const [hiddenApps, setHiddenAppsState] = useState<string[]>([])
  const [showMore, setShowMore] = useState(false)
  const [swipeToast, setSwipeToast] = useState(false)
  const [appOrder, setAppOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return MOBILE_APPS.map(a => a.id)
    const saved = localStorage.getItem('braosa-app-order')
    return saved ? JSON.parse(saved) : MOBILE_APPS.map(a => a.id)
  })
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('braosa-shortcuts')
    return saved ? JSON.parse(saved) : []
  })
  const [wipVisible, setWipVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('braosa-wip-visible') !== 'false'
  })
  const swipeStartY = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHiddenAppsState(getHiddenApps())
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

  const dateStr = (() => {
    const locale = lang === 'pt' ? 'pt-PT' : 'en-IE'
    const raw = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  })()

  function handleContainerClick() {
    if (editMode) setEditMode(false)
    if (showMore) setShowMore(false)
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (touch.clientY < window.innerHeight * 0.2) {
      swipeStartY.current = touch.clientY
    } else {
      swipeStartY.current = null
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (swipeStartY.current === null) return
    const touch = e.touches[0]
    const deltaY = touch.clientY - swipeStartY.current
    if (deltaY > 60 && !swipeToast) {
      setSwipeToast(true)
      swipeStartY.current = null
      setTimeout(() => setSwipeToast(false), 2000)
    }
  }

  function handlePointerDown(appId: string) {
    if (editMode) return
    setPressedApp(appId)
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setEditMode(true)
      setPressedApp(null)
    }, 500)
  }

  function handlePointerUp(appId: string) {
    setPressedApp(null)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (!isLongPress.current && !editMode) {
      onOpenApp(appId)
    }
    isLongPress.current = false
  }

  function handlePointerCancel() {
    setPressedApp(null)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function unhideApp(id: string) {
    const updated = hiddenApps.filter(a => a !== id)
    setHiddenApps(updated)
    setHiddenAppsState(updated)
  }

  function removeShortcut(id: string) {
    const updated = shortcuts.filter(s => s.id !== id)
    setShortcuts(updated)
    localStorage.setItem('braosa-shortcuts', JSON.stringify(updated))
  }

  const visibleApps = appOrder
    .map(id => MOBILE_APPS.find(a => a.id === id))
    .filter((a): a is MobileApp => !!a && !hiddenApps.includes(a.id))

  const hiddenAppObjs = MOBILE_APPS.filter(a => hiddenApps.includes(a.id))

  return (
    <div
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 80% 40% at 20% 10%, #3d1f6e40, transparent 60%), radial-gradient(ellipse 60% 30% at 80% 80%, #0d4a4440, transparent 50%), linear-gradient(180deg, #1a1714, #141210)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
        overflowY: 'auto',
      }}
    >
      {/* Swipe-down toast */}
      {swipeToast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-raised)', color: 'var(--ink)', borderRadius: 12,
          padding: '8px 16px', fontSize: 13, zIndex: 200, pointerEvents: 'none',
          animation: 'toast-slide-up 0.3s ease both',
        }}>
          Search coming soon
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40, paddingTop: 32 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 12vw, 64px)',
          fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"', lineHeight: 1, marginBottom: 8,
        }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 4 }}>{dateStr}</div>
        {greeting && (
          <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 32 }}>{greeting}</div>
        )}
      </div>

      {/* App grid */}
      <div
        ref={gridRef}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, padding: '0 24px' }}
        onPointerMove={(e) => {
          if (dragIndex === null || !gridRef.current) return
          const rect = gridRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const col = Math.floor(x / (rect.width / 4))
          const row = Math.floor(y / (rect.height / Math.ceil(visibleApps.length / 4)))
          const idx = Math.min(row * 4 + col, visibleApps.length - 1)
          if (idx >= 0) setDragOverIndex(idx)
        }}
        onPointerUp={() => {
          if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
            const newOrder = [...appOrder]
            const [moved] = newOrder.splice(dragIndex, 1)
            newOrder.splice(dragOverIndex, 0, moved)
            setAppOrder(newOrder)
            localStorage.setItem('braosa-app-order', JSON.stringify(newOrder))
          }
          setDragIndex(null)
          setDragOverIndex(null)
        }}
      >
        {visibleApps.map((app, visIdx) => {
          const label = lang === 'pt' ? app.label_pt : app.label_en
          const isPressed = pressedApp === app.id
          const IconComponent = APP_ICON_MAP[app.id]
          const isDragging = dragIndex === visIdx
          const isDragTarget = dragOverIndex === visIdx && dragIndex !== visIdx
          return (
            <div
              key={app.id}
              className="mobile-home-icon"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                ...(isDragging ? { opacity: 0.5, zIndex: 100 } : {}),
                ...(isDragTarget ? { outline: `2px dashed ${app.color}66`, borderRadius: 16 } : {}),
              } as React.CSSProperties}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => { if (editMode) e.stopPropagation() }}
              onPointerDown={(e) => {
                e.stopPropagation()
                if (editMode) {
                  e.preventDefault()
                  setDragIndex(visIdx)
                } else {
                  handlePointerDown(app.id)
                }
              }}
              onPointerUp={(e) => {
                if (!editMode) {
                  e.stopPropagation()
                  handlePointerUp(app.id)
                }
              }}
              onPointerCancel={() => {
                if (editMode) {
                  setDragIndex(null)
                  setDragOverIndex(null)
                } else {
                  handlePointerCancel()
                }
              }}
            >
              <div
                className={editMode ? 'icon-jiggle' : undefined}
                style={{
                  transform: isPressed ? 'scale(0.85)' : isDragging ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform .1s',
                  position: 'relative',
                }}
              >
                <AppIcon appId={app.id} color={app.color} size={60}>
                  {IconComponent && <IconComponent />}
                </AppIcon>
                {wipVisible && (
                  <div style={{
                    position: 'absolute', top: -4, right: -4, zIndex: 10,
                    background: '#D4A843', color: '#1a1410',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 5px', borderRadius: 4, pointerEvents: 'none',
                  }}>
                    WIP
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 500, color: 'var(--ink-dim)',
                textAlign: 'center', maxWidth: 64, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Shortcuts */}
      {shortcuts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            padding: '0 24px 12px',
            fontSize: 9, fontFamily: 'Space Mono, monospace',
            letterSpacing: '0.18em', color: 'var(--ink-faint)',
            textTransform: 'uppercase',
          }}>
            Shortcuts
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20, padding: '0 24px',
          }}>
            {shortcuts.map((sc) => {
              const IconComp = APP_ICON_MAP[sc.appId]
              return (
                <div
                  key={sc.id}
                  className="mobile-home-icon"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    position: 'relative', cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as React.CSSProperties}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={(e) => {
                    if (editMode) { e.stopPropagation(); return }
                    onOpenApp(sc.appId, sc.subTabId)
                  }}
                >
                  {editMode && (
                    <button
                      style={{
                        position: 'absolute', top: -6, left: -6, zIndex: 10,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--neg)', border: '2px solid var(--bg)',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', lineHeight: 1,
                      }}
                      onClick={(e) => { e.stopPropagation(); removeShortcut(sc.id) }}
                    >×</button>
                  )}
                  <div style={{ position: 'relative' }}>
                    <AppIcon appId={sc.appId} color={sc.color} size={60}>
                      {IconComp && <IconComp />}
                    </AppIcon>
                    {wipVisible && (
                      <div style={{
                        position: 'absolute', top: -4, right: -4, zIndex: 10,
                        background: '#D4A843', color: '#1a1410',
                        fontFamily: 'Space Mono, monospace',
                        fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                        padding: '2px 5px', borderRadius: 4, pointerEvents: 'none',
                      }}>
                        WIP
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: -3, right: -3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: sc.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--bg)',
                    }}>
                      <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>→</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, color: 'var(--ink-dim)', textAlign: 'center',
                    maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {sc.label_en}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* More apps */}
      {hiddenAppObjs.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowMore(p => !p) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-dim)', textDecoration: 'underline' }}
          >
            {lang === 'pt' ? 'Mais apps' : 'More apps'}
          </button>

          {showMore && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                margin: '12px 24px 0', background: 'var(--bg-raised)',
                border: '1px solid var(--edge)', borderRadius: 12, padding: '8px 0',
              }}
            >
              {hiddenAppObjs.map(app => (
                <div
                  key={app.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}
                >
                  <span style={{ color: app.color }}>
                    <Icon name={app.glyph as any} size={18} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
                    {lang === 'pt' ? app.label_pt : app.label_en}
                  </span>
                  <button
                    onClick={() => unhideApp(app.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--c-dash)' }}
                  >
                    {lang === 'pt' ? 'Mostrar' : 'Show'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit mode footer */}
      {editMode && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            margin: '24px 24px 0',
            background: 'var(--bg-raised)',
            border: '1px solid var(--edge)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-dim)', flex: 1 }}>Show WIP badges</span>
            <button
              onClick={() => {
                const next = !wipVisible
                setWipVisible(next)
                localStorage.setItem('braosa-wip-visible', String(next))
              }}
              style={{
                width: 44, height: 26, borderRadius: 13,
                background: wipVisible ? '#E8E0D5' : 'var(--bg-raised)',
                border: '1px solid var(--edge)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: wipVisible ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <button
            onClick={() => setEditMode(false)}
            style={{
              marginTop: 12, width: '100%', padding: '8px',
              background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
              borderRadius: 8, cursor: 'pointer', fontSize: 13,
              color: 'var(--ink-dim)', fontWeight: 500,
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

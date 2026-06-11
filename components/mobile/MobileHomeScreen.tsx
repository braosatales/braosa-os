'use client'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui'
import { MOBILE_APPS } from '@/lib/mobile-apps'
import { useLang } from '@/lib/i18n'
import { AppIcon } from './AppIcon'
import {
  IconDashboard, IconFinances, IconTasks, IconNotes, IconHealth,
  IconNutrition, IconMail, IconCalendar, IconContacts, IconDrive,
  IconAI, IconBraosa, IconVerum,
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
  onOpenApp: (appId: string) => void
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
  const swipeStartY = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

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

  const visibleApps = MOBILE_APPS.filter(a => !hiddenApps.includes(a.id))
  const hiddenAppObjs = MOBILE_APPS.filter(a => hiddenApps.includes(a.id))

  return (
    <div
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 80% 40% at 20% 10%, oklch(0.25 0.04 290 / 0.4), transparent 60%),
          radial-gradient(ellipse 60% 30% at 80% 80%, oklch(0.22 0.03 195 / 0.3), transparent 50%),
          radial-gradient(120% 100% at 50% 0%, oklch(0.205 0.007 70), var(--bg-void))
        `,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
        overflowY: 'auto',
      }}
    >
      {/* Swipe-down toast */}
      {swipeToast && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-raised)',
          color: 'var(--ink)',
          borderRadius: 12,
          padding: '8px 16px',
          fontSize: 13,
          zIndex: 200,
          pointerEvents: 'none',
          animation: 'toast-slide-up 0.3s ease both',
        }}>
          Search coming soon
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40, paddingTop: 32 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 12vw, 64px)',
          fontWeight: 600,
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          lineHeight: 1,
          marginBottom: 8,
        }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 4 }}>
          {dateStr}
        </div>
        {greeting && (
          <div style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 32 }}>
            {greeting}
          </div>
        )}
      </div>

      {/* App grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 20,
        padding: '0 24px',
      }}>
        {visibleApps.map(app => {
          const label = lang === 'pt' ? app.label_pt : app.label_en
          const isPressed = pressedApp === app.id
          const IconComponent = APP_ICON_MAP[app.id]
          return (
            <div
              key={app.id}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onPointerDown={e => { e.stopPropagation(); handlePointerDown(app.id) }}
              onPointerUp={e => { e.stopPropagation(); handlePointerUp(app.id) }}
              onPointerCancel={handlePointerCancel}
            >
              <div
                className={editMode ? 'icon-jiggle' : undefined}
                style={{
                  transform: isPressed ? 'scale(0.85)' : 'scale(1)',
                  transition: 'transform .1s',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                <AppIcon appId={app.id} color={app.color} size={60}>
                  {IconComponent && <IconComponent />}
                </AppIcon>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--ink-dim)',
                textAlign: 'center',
                maxWidth: 64,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

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
                margin: '12px 24px 0',
                background: 'var(--bg-raised)',
                border: '1px solid var(--edge)',
                borderRadius: 12,
                padding: '8px 0',
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
    </div>
  )
}

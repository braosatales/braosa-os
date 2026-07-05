'use client'
import { useState, useEffect, useRef, useContext } from 'react'
import { Icon } from '@/components/ui'
import { MOBILE_APPS, type MobileApp } from '@/lib/mobile-apps'
import { useLang } from '@/lib/i18n'
import { AppIcon } from './AppIcon'
import {
  IconFinances, IconTasks, IconNotes, IconHealth,
  IconNutrition, IconMail, IconCalendar, IconContacts, IconDrive,
  IconAI, IconBraosa, IconVerum,
} from './AppIcons'
import { NotificationsContext, type NotificationCounts } from '@/lib/notifications'

const APP_ICON_MAP: Record<string, React.ComponentType> = {
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

type Shortcut = {
  id: string
  appId: string
  subTabId: string
  label_pt: string
  label_en: string
  color: string
  glyph: string
}

const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=38.7061&longitude=-8.9747&current=temperature_2m,weather_code&timezone=Europe/Lisbon'
// TODO: city picker — Montijo is hardcoded for now
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast?latitude=38.7061&longitude=-8.9747&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Lisbon&forecast_days=7'
const DIAS_CURTO_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getDayName(dateStr: string): string {
  return DIAS_CURTO_PT[new Date(dateStr).getDay()]
}

function getCalendarDays(): (number | null)[] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function getWeatherIcon(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Limpo' }
  if (code <= 2) return { emoji: '🌤', label: 'Maioria limpo' }
  if (code === 3) return { emoji: '☁️', label: 'Nublado' }
  if (code <= 49) return { emoji: '🌫', label: 'Nevoeiro' }
  if (code <= 59) return { emoji: '🌦', label: 'Chuvisco' }
  if (code <= 69) return { emoji: '🌧', label: 'Chuva' }
  if (code <= 79) return { emoji: '❄️', label: 'Neve' }
  if (code <= 84) return { emoji: '🌧', label: 'Aguaceiro' }
  if (code <= 99) return { emoji: '⛈', label: 'Trovoada' }
  return { emoji: '🌡', label: 'Desconhecido' }
}

function formatBadgeText(value: number | boolean): string {
  if (typeof value === 'boolean') return '!'
  if (value >= 100) return '99+'
  return String(value)
}

function getBadgeContent(appId: string, counts: NotificationCounts): string | null {
  switch (appId) {
    case 'mail':      return counts.mail > 0      ? formatBadgeText(counts.mail)      : null
    case 'contacts':  return counts.contacts > 0  ? formatBadgeText(counts.contacts)  : null
    case 'tasks':     return counts.tasks > 0     ? formatBadgeText(counts.tasks)     : null
    case 'calendar':  return counts.calendar > 0  ? formatBadgeText(counts.calendar)  : null
    case 'health':    return counts.health        ? '!'                                : null
    case 'nutrition': return counts.nutrition     ? '!'                                : null
    case 'verum':     return counts.verum         ? '!'                                : null
    default:          return null
  }
}

const APP_ORDER_KEY = 'braosa-app-order'
const DEFAULT_LAYOUT_KEY = 'braosa-default-layout'
const DEFAULT_APP_ORDER = MOBILE_APPS.map(a => a.id)

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
  const [editMode, setEditMode] = useState(false)
  const [pressedApp, setPressedApp] = useState<string | null>(null)
  const [hiddenApps, setHiddenAppsState] = useState<string[]>([])
  const [showMore, setShowMore] = useState(false)
  const [swipeToast, setSwipeToast] = useState(false)
  const [savedConfirm, setSavedConfirm] = useState(false)
  const [appOrder, setAppOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_APP_ORDER
    const saved = localStorage.getItem(APP_ORDER_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_APP_ORDER
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
  const [calendarPopup, setCalendarPopup] = useState(false)
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [forecastOpen, setForecastOpen] = useState(false)
  const [forecast, setForecast] = useState<Array<{ date: string; code: number; max: number; min: number }> | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const swipeStartY = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const { counts } = useContext(NotificationsContext)

  useEffect(() => {
    const el = rootRef.current
    console.log('HOMESCREEN window.innerHeight:', window.innerHeight)
    console.log('HOMESCREEN visualViewport.height:', window.visualViewport?.height)
    console.log('HOMESCREEN clientHeight:', document.documentElement.clientHeight)
    console.log('HOMESCREEN root.offsetHeight (current):', el?.offsetHeight)
    if (el) {
      const prev = el.style.height
      el.style.height = '100lvh'
      requestAnimationFrame(() => {
        console.log('HOMESCREEN root.offsetHeight with 100lvh:', el?.offsetHeight)
        el.style.height = prev
      })
    }
  }, [])

  useEffect(() => {
    setHiddenAppsState(getHiddenApps())
  }, [])

  useEffect(() => {
    if (!localStorage.getItem(DEFAULT_LAYOUT_KEY)) {
      localStorage.setItem(DEFAULT_LAYOUT_KEY, JSON.stringify(DEFAULT_APP_ORDER))
    }
  }, [])

  useEffect(() => {
    fetch(WEATHER_URL)
      .then(res => {
        if (!res.ok) throw new Error('weather fetch failed')
        return res.json()
      })
      .then(data => {
        setWeather({ temp: data.current.temperature_2m, code: data.current.weather_code })
        setWeatherStatus('ready')
      })
      .catch(() => setWeatherStatus('error'))
  }, [])

  function handleCalendarTap(e: React.MouseEvent) {
    e.stopPropagation()
    setCalendarPopup(prev => {
      const next = !prev
      if (next) setTimeout(() => setCalendarPopup(false), 3000)
      return next
    })
  }

  function handleWeatherTap(e: React.MouseEvent) {
    e.stopPropagation()
    setForecastOpen(true)
    if (!forecast) {
      setForecastLoading(true)
      fetch(FORECAST_URL)
        .then(r => r.json())
        .then(data => {
          const days = data.daily.time.map((date: string, i: number) => ({
            date,
            code: data.daily.weather_code[i],
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
          }))
          setForecast(days)
          setForecastLoading(false)
        })
        .catch(() => setForecastLoading(false))
    }
  }

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

  function handleResetToDefault() {
    const raw = localStorage.getItem(DEFAULT_LAYOUT_KEY)
    const parsed = raw ? JSON.parse(raw) : DEFAULT_APP_ORDER
    if (!Array.isArray(parsed) || parsed.length === 0) return
    setAppOrder(parsed)
    localStorage.setItem(APP_ORDER_KEY, JSON.stringify(parsed))
  }

  function handleSaveAsDefault() {
    localStorage.setItem(DEFAULT_LAYOUT_KEY, JSON.stringify(appOrder))
    setSavedConfirm(true)
    setTimeout(() => setSavedConfirm(false), 1500)
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
      ref={rootRef}
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100lvh',
        background: '#0F1117',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
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

      {/* Header: dot-grid calendar + logo divider + weather */}
      <div style={{ display: 'flex', alignItems: 'stretch', padding: '32px 16px 24px', gap: 8 }}>
        {/* LEFT: dot-grid mini-calendar */}
        <div style={{ flex: '0 0 38%', position: 'relative', cursor: 'pointer' }} onClick={handleCalendarTap}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {WEEKDAY_LETTERS.map((letter, i) => (
              <div key={i} style={{
                fontSize: 8, textAlign: 'center', color: 'var(--ink-faint)',
                fontFamily: 'Space Mono, monospace',
              }}>
                {letter}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {(() => {
              const todayNum = new Date().getDate()
              return getCalendarDays().map((day, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 7 }}>
                  {day !== null && (
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: day === todayNum ? '#FFFFFF' : day < todayNum ? '#4A4A4A' : '#2A2A2A',
                      boxShadow: day === todayNum ? '0 0 6px 2px rgba(255,255,255,0.45)' : undefined,
                    }} />
                  )}
                </div>
              ))
            })()}
          </div>
          {calendarPopup && (() => {
            const today = new Date()
            const popupDateStr = `${DIAS_PT[today.getDay()]}, ${today.getDate()} de ${MESES_PT[today.getMonth()]} de ${today.getFullYear()}`
            return (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50,
                background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap',
              }}>
                {popupDateStr}
              </div>
            )
          })()}
        </div>

        {/* CENTER: logo divider */}
        <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {/* TODO: replace with white-inverted logo when available */}
          <img src="/icon.png" width={28} height={28} style={{ borderRadius: 6, opacity: 0.85 }} alt="" />
        </div>

        {/* RIGHT: weather */}
        <div
          style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={handleWeatherTap}
        >
          {weatherStatus === 'loading' && (
            <div style={{ fontSize: 20, color: 'var(--ink-dim)' }}>...</div>
          )}
          {weatherStatus === 'error' && (
            <div style={{ fontSize: 20, color: 'var(--ink-dim)' }}>—</div>
          )}
          {weatherStatus === 'ready' && weather && (() => {
            const { emoji, label } = getWeatherIcon(weather.code)
            return (
              <>
                <div style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>
                  {Math.round(weather.temp)}°C
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>{label}</div>
              </>
            )
          })()}

          {forecastOpen && (
            <>
              <div
                onClick={(e) => { e.stopPropagation(); setForecastOpen(false) }}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                  background: '#1C1E26', border: '1px solid var(--edge)', borderRadius: 12,
                  padding: 12, display: 'flex', gap: 10, overflowX: 'auto',
                  maxWidth: '80vw',
                }}
              >
                {forecastLoading && (
                  <div style={{ fontSize: 12, color: 'var(--ink-dim)', padding: '8px 4px' }}>...</div>
                )}
                {!forecastLoading && forecast && forecast.map((day) => {
                  const { emoji } = getWeatherIcon(day.code)
                  return (
                    <div key={day.date} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      minWidth: 40,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{getDayName(day.date)}</div>
                      <div style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{day.max}°</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{day.min}°</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
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
            localStorage.setItem(APP_ORDER_KEY, JSON.stringify(newOrder))
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
          const badgeText = counts !== null ? getBadgeContent(app.id, counts) : null
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
                {badgeText !== null && (
                  <div style={{
                    position: 'absolute', top: -4, right: -4, zIndex: 20,
                    background: '#EF4444', color: '#fff',
                    minWidth: 18, height: 18,
                    borderRadius: 9,
                    fontFamily: 'Space Mono, monospace',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                    border: '1.5px solid #141210',
                    pointerEvents: 'none',
                  }}>
                    {badgeText}
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <button
              onClick={handleResetToDefault}
              style={{ fontSize: 13, color: '#FF6B6B', background: 'transparent', border: '1px solid #FF6B6B', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
            >
              Reset to Default
            </button>
            <button
              onClick={handleSaveAsDefault}
              style={{ fontSize: 13, color: '#6B9FFF', background: 'transparent', border: '1px solid #6B9FFF', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
            >
              {savedConfirm ? '✓ Saved' : 'Save as Default'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

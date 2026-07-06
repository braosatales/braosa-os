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

type NotificationBanner = {
  id: string
  icon: string
  message: string
  appKey: string
}

const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DEFAULT_LOCATION = { name: 'Montijo', lat: 38.7061, lon: -8.9747 }
const DIAS_CURTO_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function weatherUrl(lat: number, lon: number): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe/Lisbon`
}

function forecastUrl(lat: number, lon: number): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Lisbon&forecast_days=7`
}

type GeocodingResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; id: number }
type FavoriteLocation = { id: string; display_name: string; latitude: number; longitude: number; created_at?: string }

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
  const [tappedDay, setTappedDay] = useState<number | null>(null)
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [forecastOpen, setForecastOpen] = useState(false)
  const [forecast, setForecast] = useState<Array<{ date: string; code: number; max: number; min: number }> | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [activeLocation, setActiveLocation] = useState<{ name: string; lat: number; lon: number }>(DEFAULT_LOCATION)
  const [locationSearchOpen, setLocationSearchOpen] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([])
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([])
  const [favoritesTab, setFavoritesTab] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const swipeStartY = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const tappedDayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { counts } = useContext(NotificationsContext)
  const [notifications, setNotifications] = useState<NotificationBanner[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!counts) return
    let cancelled = false

    async function buildNotifications() {
      const banners: NotificationBanner[] = []

      if (counts!.tasks > 0) {
        const n = counts!.tasks
        banners.push({
          id: 'tasks-overdue',
          icon: '⚠️',
          message: `${n} tarefa${n === 1 ? '' : 's'} atrasada${n === 1 ? '' : 's'}`,
          appKey: 'tasks',
        })
      }

      if (counts!.mail > 0) {
        const n = counts!.mail
        banners.push({
          id: 'mail-unread',
          icon: '✉️',
          message: `${n} email${n === 1 ? '' : 's'} por ler`,
          appKey: 'mail',
        })
      }

      if (counts!.calendar > 0) {
        const n = counts!.calendar
        let eventBanner: NotificationBanner | null = null
        if (n === 1) {
          try {
            const now = new Date()
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
            const res = await fetch(`/api/calendar/events?start=${startOfDay}&end=${endOfDay}&calendarId=primary`)
            const data = await res.json()
            const event = data.events?.[0]
            if (event) {
              const time = event.allDay ? '' : ` às ${new Date(event.start).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
              eventBanner = {
                id: `calendar-today-${event.id}`,
                icon: '📅',
                message: `${event.title}${time}`,
                appKey: 'calendar',
              }
            }
          } catch {}
        }
        banners.push(eventBanner ?? {
          id: 'calendar-today',
          icon: '📅',
          message: `${n} evento${n === 1 ? '' : 's'} hoje`,
          appKey: 'calendar',
        })
      }

      if (!cancelled) setNotifications(banners)
    }

    buildNotifications()
    return () => { cancelled = true }
  }, [counts])

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
    fetch('/api/weather-location').then(r => r.json()).then(data => {
      if (data?.location) {
        setActiveLocation({ name: data.location.display_name, lat: data.location.latitude, lon: data.location.longitude })
      }
    }).catch(() => {})
    fetch('/api/weather-location/favorites').then(r => r.json()).then(data => {
      if (data?.favorites) setFavorites(data.favorites)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setWeatherStatus('loading')
    fetch(weatherUrl(activeLocation.lat, activeLocation.lon))
      .then(res => {
        if (!res.ok) throw new Error('weather fetch failed')
        return res.json()
      })
      .then(data => {
        setWeather({ temp: data.current.temperature_2m, code: data.current.weather_code })
        setWeatherStatus('ready')
      })
      .catch(() => setWeatherStatus('error'))
  }, [activeLocation])

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
      fetch(forecastUrl(activeLocation.lat, activeLocation.lon))
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

  function handleDotTap(e: React.MouseEvent, day: number, isToday: boolean) {
    e.stopPropagation()
    if (isToday) {
      handleCalendarTap(e)
      return
    }
    setTappedDay(day)
    if (tappedDayTimer.current) clearTimeout(tappedDayTimer.current)
    tappedDayTimer.current = setTimeout(() => setTappedDay(null), 1500)
  }

  function handleLocationTap(e: React.MouseEvent) {
    e.stopPropagation()
    setLocationSearchOpen(prev => !prev)
  }

  async function handleLocationSearch(query: string) {
    setLocationQuery(query)
    if (query.length < 2) { setLocationResults([]); return }
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`)
      const data = await res.json()
      setLocationResults(data.results || [])
    } catch {
      setLocationResults([])
    }
  }

  async function handleSelectLocation(loc: GeocodingResult) {
    const displayName = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ')
    setActiveLocation({ name: displayName, lat: loc.latitude, lon: loc.longitude })
    setLocationSearchOpen(false)
    setLocationQuery('')
    setLocationResults([])
    setForecast(null)
    try {
      await fetch('/api/weather-location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, latitude: loc.latitude, longitude: loc.longitude }),
      })
    } catch {}
  }

  async function handleSelectFavorite(fav: FavoriteLocation) {
    setActiveLocation({ name: fav.display_name, lat: fav.latitude, lon: fav.longitude })
    setLocationSearchOpen(false)
    setForecast(null)
    try {
      await fetch('/api/weather-location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: fav.display_name, latitude: fav.latitude, longitude: fav.longitude }),
      })
    } catch {}
  }

  const handleToggleFavorite = async (loc: { name?: string; latitude?: number; longitude?: number; lat?: number; lon?: number; display_name?: string }) => {
    const lat = loc.latitude ?? loc.lat ?? 0
    const lon = loc.longitude ?? loc.lon ?? 0
    const name = loc.display_name ?? loc.name ?? ''
    const existing = favorites.find(f => Math.abs(f.latitude - lat) < 0.001 && Math.abs(f.longitude - lon) < 0.001)
    if (existing) {
      setFavorites(prev => prev.filter(f => f.id !== existing.id))
      try {
        await fetch(`/api/weather-location/favorites/${existing.id}`, { method: 'DELETE' })
      } catch {}
    } else {
      const tempId = `temp-${Date.now()}`
      setFavorites(prev => [...prev, { id: tempId, display_name: name, latitude: lat, longitude: lon, created_at: new Date().toISOString() }])
      try {
        const res = await fetch('/api/weather-location/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: name, latitude: lat, longitude: lon }),
        })
        const data = await res.json()
        if (data?.favorite?.id) {
          setFavorites(prev => prev.map(f => f.id === tempId ? { ...f, id: data.favorite.id } : f))
        }
      } catch {}
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

      {/* Header: dot-grid calendar + logo + weather */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 8, padding: '10px 14px', minHeight: 90 }}>
        {/* COLUMN 1: dot-grid mini-calendar */}
        <div style={{ flex: '0 0 35%', position: 'relative', cursor: 'pointer' }} onClick={handleCalendarTap}>
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
              return getCalendarDays().map((day, idx) => {
                const isToday = day === todayNum
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 7, position: 'relative' }}>
                    {day !== null && (
                      <>
                        <div
                          onClick={(e) => handleDotTap(e, day, isToday)}
                          style={{
                            width: 7, height: 7, borderRadius: '50%', cursor: 'pointer',
                            background: isToday ? '#FFFFFF' : day < todayNum ? '#4A4A4A' : '#2A2A2A',
                            boxShadow: isToday ? '0 0 6px 2px rgba(255,255,255,0.45)' : undefined,
                          }}
                        />
                        {tappedDay === day && !isToday && (
                          <span style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                            marginBottom: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 4,
                            fontSize: 9, padding: '1px 3px', color: '#fff', whiteSpace: 'nowrap', zIndex: 10,
                          }}>
                            {day}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              })
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

        {/* COLUMN 2: logo */}
        <div style={{ width: 44, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* TODO: replace with white-inverted logo when available */}
          <img src="/icon.png" style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: 6, opacity: 0.85 }} alt="" />
        </div>

        {/* COLUMN 3: weather */}
        <div
          style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', cursor: 'pointer' }}
          onClick={handleWeatherTap}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                      {Math.round(weather.temp)}°C
                    </div>
                    <div style={{ fontSize: 10, color: '#888' }}>{label}</div>
                  </div>
                </>
              )
            })()}
          </div>

          <div
            onClick={handleLocationTap}
            style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 4, cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            📍 {activeLocation.name} ▾
          </div>

          {locationSearchOpen && (
            <>
              <div
                onClick={(e) => { e.stopPropagation(); setLocationSearchOpen(false) }}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                  background: '#1C1E26', border: '1px solid var(--edge)', borderRadius: 12,
                  padding: 12, width: 220, maxHeight: 280, display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => setFavoritesTab(false)}
                    style={{
                      flex: 1, fontSize: 11, padding: '4px 0', borderRadius: 6, cursor: 'pointer',
                      background: !favoritesTab ? 'var(--bg-raised-2)' : 'transparent',
                      border: '1px solid var(--edge)', color: 'var(--ink)',
                    }}
                  >
                    Pesquisar
                  </button>
                  <button
                    onClick={() => setFavoritesTab(true)}
                    style={{
                      flex: 1, fontSize: 11, padding: '4px 0', borderRadius: 6, cursor: 'pointer',
                      background: favoritesTab ? 'var(--bg-raised-2)' : 'transparent',
                      border: '1px solid var(--edge)', color: 'var(--ink)',
                    }}
                  >
                    Favoritos
                  </button>
                </div>

                {!favoritesTab && (
                  <>
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      placeholder="Pesquisar cidade…"
                      style={{
                        fontSize: 12, padding: '6px 8px', borderRadius: 6,
                        border: '1px solid var(--edge)', background: 'var(--bg)', color: 'var(--ink)',
                        marginBottom: 8, width: '100%',
                      }}
                    />
                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {locationResults.map((r) => {
                        const displayName = [r.name, r.admin1, r.country].filter(Boolean).join(', ')
                        const isFav = favorites.some(f => Math.abs(f.latitude - r.latitude) < 0.001 && Math.abs(f.longitude - r.longitude) < 0.001)
                        return (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
                            <div
                              onClick={() => handleSelectLocation(r)}
                              style={{ flex: 1, fontSize: 11, color: 'var(--ink)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {displayName}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleFavorite({ display_name: displayName, latitude: r.latitude, longitude: r.longitude }) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: isFav ? '#FFD700' : '#666', flexShrink: 0 }}
                            >
                              {isFav ? '★' : '☆'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {favoritesTab && (
                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {favorites.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Sem favoritos</div>
                    )}
                    {favorites.map((f) => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
                        <div
                          onClick={() => handleSelectFavorite(f)}
                          style={{ flex: 1, fontSize: 11, color: 'var(--ink)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {f.display_name}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(f) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#FFD700', flexShrink: 0 }}
                        >
                          ★
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

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

      {/* Notification banners */}
      {notifications.filter(n => !dismissedIds.has(n.id)).map(n => (
        <div
          key={n.id}
          onClick={() => onOpenApp(n.appKey)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            margin: '4px 14px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 10,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: 20 }}>{n.icon}</span>
          <span style={{ flex: 1, fontSize: 13, color: '#E8E8E8' }}>{n.message}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setDismissedIds(prev => new Set([...prev, n.id])) }}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}

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

'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { BraosaContent, PLATFORM_META } from '@/lib/braosa'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import AddContentModal from '../modals/AddContentModal'

type ContentStatus = BraosaContent['status']
type ContentPlatform = BraosaContent['platform']

const STATUS_ORDER: ContentStatus[] = ['idea', 'draft', 'ready', 'scheduled', 'published']
const STATUS_META: Record<ContentStatus, { label_pt: string; label_en: string; next?: ContentStatus }> = {
  idea:      { label_pt: 'Ideia',     label_en: 'Idea',      next: 'draft' },
  draft:     { label_pt: 'Rascunho',  label_en: 'Draft',     next: 'ready' },
  ready:     { label_pt: 'Pronto',    label_en: 'Ready',     next: 'scheduled' },
  scheduled: { label_pt: 'Agendado',  label_en: 'Scheduled', next: 'published' },
  published: { label_pt: 'Publicado', label_en: 'Published' },
}

function MiniCalendar({ items, selectedDay, onSelectDay }: {
  items: BraosaContent[]
  selectedDay: string | null
  onSelectDay: (d: string | null) => void
}) {
  useLang()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon-based

  const monthStr = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Days with scheduled content
  const scheduledDays = new Set(
    items
      .filter(i => i.scheduled_for)
      .map(i => i.scheduled_for!.slice(0, 10))
  )

  const days: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', padding: 4 }}
        >
          <Icon name="chevron-left" size={14} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>{monthStr}</span>
        <button
          onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', padding: 4 }}
        >
          <Icon name="chevron-right" size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDay
          const hasContent = scheduledDays.has(dateStr)

          return (
            <button
              key={i}
              onClick={() => onSelectDay(isSelected ? null : dateStr)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: isSelected
                  ? 'var(--c-braosa)'
                  : isToday
                  ? 'color-mix(in oklch, var(--c-braosa) 14%, transparent)'
                  : 'transparent',
                color: isSelected ? 'oklch(0.18 0.01 80)' : isToday ? 'var(--c-braosa)' : 'var(--ink-soft)',
                fontSize: 11,
                fontWeight: isToday || isSelected ? 700 : 400,
                gap: 1,
              }}
            >
              {day}
              {hasContent && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: isSelected ? 'oklch(0.18 0.01 80)' : 'var(--c-braosa)',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <button
          onClick={() => onSelectDay(null)}
          style={{
            marginTop: 8,
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-faint)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
          }}
        >
          {L('Limpar filtro', 'Clear filter')}
        </button>
      )}
    </div>
  )
}

function StatusPipeline({ items }: { items: BraosaContent[] }) {
  useLang()
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = items.filter(i => i.status === s).length
    return acc
  }, {} as Record<ContentStatus, number>)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 18, flexWrap: 'wrap' }}>
      {STATUS_ORDER.map((status, idx) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--edge)',
            borderRadius: idx === 0 ? '8px 0 0 8px' : idx === STATUS_ORDER.length - 1 ? '0 8px 8px 0' : 0,
            borderLeft: idx > 0 ? 'none' : '1px solid var(--edge)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{L(STATUS_META[status].label_pt, STATUS_META[status].label_en)}</span>
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: counts[status] > 0 ? 'var(--c-braosa)' : 'var(--ink-faint)',
            }}>
              {counts[status]}
            </span>
          </div>
          {idx < STATUS_ORDER.length - 1 && (
            <div style={{ color: 'var(--ink-faint)', fontSize: 10, zIndex: 1 }}>→</div>
          )}
        </div>
      ))}
    </div>
  )
}

function ContentCard({ item, onEdit, onDelete, onAdvance }: {
  item: BraosaContent
  onEdit: (i: BraosaContent) => void
  onDelete: (id: string) => void
  onAdvance: (id: string, status: ContentStatus) => void
}) {
  useLang()
  const platformMeta = PLATFORM_META[item.platform]
  const statusMeta = STATUS_META[item.status]
  const nextStatus = statusMeta.next

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--edge)',
      borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 99,
              background: `color-mix(in oklch, ${platformMeta.color} 16%, transparent)`,
              color: platformMeta.color, fontWeight: 600,
            }}>
              {platformMeta.label}
            </span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 99,
              background: 'var(--bg-raised-2)', color: 'var(--ink-dim)', fontWeight: 500,
            }}>
              {L(statusMeta.label_pt, statusMeta.label_en)}
            </span>
            {item.scheduled_for && (
              <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                <Icon name="clock" size={9} />{' '}
                {new Date(item.scheduled_for).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
            {item.title}
          </div>

          {item.body && (
            <div style={{
              fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              marginBottom: 6,
            }}>
              {item.body}
            </div>
          )}

          {item.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {item.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: 'var(--bg-raised-2)', color: 'var(--ink-dim)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(item)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}>
            <Icon name="edit" size={12} />
          </button>
          <button onClick={() => onDelete(item.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 4 }}>
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>

      {nextStatus && (
        <button
          onClick={() => onAdvance(item.id, nextStatus)}
          style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--c-braosa)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
          }}
        >
          → {L(`Mover para ${STATUS_META[nextStatus].label_pt}`, `Move to ${STATUS_META[nextStatus].label_en}`)}
        </button>
      )}
    </div>
  )
}

export default function ContentView() {
  useLang()
  const isMobile = useIsMobile()
  const [items, setItems] = useState<BraosaContent[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BraosaContent | null>(null)

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch('/api/braosa/content')
      if (res.ok) {
        const data = await res.json()
        setItems(data.content ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContent() }, [fetchContent])

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/braosa/content/${id}`, { method: 'DELETE' })
  }

  const handleAdvance = async (id: string, status: ContentStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    await fetch(`/api/braosa/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  const filteredItems = items.filter(item => {
    if (platformFilter !== 'all' && item.platform !== platformFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (selectedDay) {
      const itemDay = item.scheduled_for?.slice(0, 10)
      if (itemDay !== selectedDay) return false
    }
    return true
  })

  const PLATFORM_OPTIONS: { value: ContentPlatform | 'all'; label: string }[] = [
    { value: 'all', label: L('Todos', 'All') },
    ...Object.entries(PLATFORM_META).map(([k, v]) => ({ value: k as ContentPlatform, label: v.label })),
  ]

  const STATUS_FILTER_OPTIONS = [
    { value: 'all' as const, label_pt: 'Todos', label_en: 'All' },
    ...STATUS_ORDER.map(s => ({ value: s as ContentStatus | 'all', label_pt: STATUS_META[s].label_pt, label_en: STATUS_META[s].label_en })),
  ]

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left: Calendar (hidden on mobile) */}
      {!isMobile && (
        <div style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--edge-soft)',
          padding: 16,
          overflowY: 'auto',
        }}>
          <MiniCalendar items={items} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        </div>
      )}

      {/* Right: Content list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            {L('Conteúdo', 'Content')}
          </div>
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-braosa)' } as React.CSSProperties}
            onClick={() => { setEditingItem(null); setModalOpen(true) }}
          >
            <Icon name="plus" size={14} />
            {L('Nova Ideia', 'New Idea')}
          </button>
        </div>

        {/* Status pipeline */}
        <StatusPipeline items={items} />

        {/* Platform filter chips */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {PLATFORM_OPTIONS.map(p => {
            const isActive = platformFilter === p.value
            return (
              <button
                key={p.value}
                onClick={() => setPlatformFilter(p.value)}
                style={{
                  padding: '4px 12px', borderRadius: 99,
                  border: `1px solid ${isActive ? 'var(--c-braosa)' : 'var(--edge)'}`,
                  background: isActive ? 'color-mix(in oklch, var(--c-braosa) 14%, transparent)' : 'transparent',
                  color: isActive ? 'var(--c-braosa)' : 'var(--ink-dim)',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_FILTER_OPTIONS.map(s => {
            const isActive = statusFilter === s.value
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value as ContentStatus | 'all')}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${isActive ? 'var(--edge-strong)' : 'var(--edge-soft)'}`,
                  background: isActive ? 'var(--bg-raised-2)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-faint)',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                {L(s.label_pt, s.label_en)}
              </button>
            )
          })}
        </div>

        {/* Content cards */}
        {filteredItems.length === 0 ? (
          <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            {L('Nenhum conteúdo encontrado.', 'No content found.')}
          </div>
        ) : (
          filteredItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={i => { setEditingItem(i); setModalOpen(true) }}
              onDelete={handleDelete}
              onAdvance={handleAdvance}
            />
          ))
        )}
      </div>

      <AddContentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null) }}
        onSaved={fetchContent}
        editing={editingItem}
      />
    </div>
  )
}

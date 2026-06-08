'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Widget from '@/components/os/Widget'
import Icon from '@/components/os/Icon'
import NotesWidget from '@/components/widgets/NotesWidget'
import TasksWidget from '@/components/widgets/TasksWidget'
import HabitsWidget from '@/components/widgets/HabitsWidget'
import { NetWorthWidget, AssetsWidget, DebtWidget } from '@/components/widgets/FinanceWidget'
import BudgetWidget from '@/components/widgets/BudgetWidget'
import { useUser } from '@/lib/UserContext'

const GRID_COLS = 5
const GRID_ROW_H = 118
const GRID_GAP = 16
const GRID_MAX_H = 5

interface WidgetDef {
  id: string
  col: number
  row: number
  w: number
  h: number
  title: string
  color: string
  glyph: string
}

const DEFAULT_LAYOUT: WidgetDef[] = [
  { id: 'net',     col: 1, row: 1, w: 2, h: 2, title: 'Net Worth',   color: 'var(--c-fin)',    glyph: 'coins'   },
  { id: 'tasks',   col: 3, row: 1, w: 2, h: 2, title: 'Top Tasks',   color: 'var(--c-task)',   glyph: 'check'   },
  { id: 'assets',  col: 5, row: 1, w: 1, h: 1, title: 'Assets',      color: 'var(--c-fin)',    glyph: 'bank'    },
  { id: 'debt',    col: 5, row: 2, w: 1, h: 1, title: 'Debt',        color: 'var(--c-health)', glyph: 'umbrella'},
  { id: 'budget',  col: 1, row: 3, w: 2, h: 2, title: 'Budget',      color: 'var(--c-fin)',    glyph: 'chart'   },
  { id: 'ai',      col: 3, row: 3, w: 2, h: 2, title: 'Braosa AI',   color: 'var(--c-braosa)', glyph: 'spark'   },
  { id: 'weather', col: 5, row: 3, w: 1, h: 1, title: 'Weather',     color: 'var(--c-dash)',   glyph: 'cloud'   },
  { id: 'health',  col: 5, row: 4, w: 1, h: 1, title: 'Health',      color: 'var(--c-health)', glyph: 'pulse'   },
  { id: 'focus',   col: 1, row: 5, w: 3, h: 1, title: 'Today Focus', color: 'var(--c-task)',   glyph: 'target'  },
  { id: 'habits',  col: 4, row: 5, w: 2, h: 1, title: 'Habits',      color: 'var(--c-cal)',    glyph: 'refresh' },
  { id: 'notes',   col: 1, row: 6, w: 3, h: 2, title: 'Notes',       color: 'var(--c-dash)',   glyph: 'note'    },
]

function getGreeting(firstName: string) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${firstName}.`
  if (h < 18) return `Good afternoon, ${firstName}.`
  return `Good evening, ${firstName}.`
}

function resolveCollisions(layout: WidgetDef[]): WidgetDef[] {
  const result = [...layout]
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j]
        const aRight = a.col + a.w - 1
        const bRight = b.col + b.w - 1
        const aBot = a.row + a.h - 1
        const bBot = b.row + b.h - 1
        const overlap =
          a.col <= bRight && aRight >= b.col &&
          a.row <= bBot && aBot >= b.row
        if (overlap) {
          result[j] = { ...result[j], row: aBot + 1 }
          changed = true
        }
      }
    }
  }
  return result
}

function widgetStyle(w: WidgetDef, cellW: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: (w.col - 1) * (cellW + GRID_GAP),
    top: (w.row - 1) * (GRID_ROW_H + GRID_GAP),
    width: w.w * cellW + (w.w - 1) * GRID_GAP,
    height: w.h * GRID_ROW_H + (w.h - 1) * GRID_GAP,
    transition: 'left .18s ease, top .18s ease, width .18s ease, height .18s ease',
  }
}

export default function DashboardPage() {
  const { user } = useUser()
  const [layout, setLayout] = useState<WidgetDef[]>(DEFAULT_LAYOUT)
  const [narrow, setNarrow] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [lifted, setLifted] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startCol: number; startRow: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; id: string } | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('braosa-layout-v4')
      if (saved) setLayout(JSON.parse(saved))
    } catch {}
    const mq = window.matchMedia('(max-width: 900px)')
    setNarrow(mq.matches)
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('braosa-layout-v4', JSON.stringify(layout)) } catch {}
  }, [layout])

  const containerWidth = narrow ? (containerRef.current?.clientWidth ?? 900) - 48 : (containerRef.current?.clientWidth ?? 900) - 48
  const cellW = narrow ? containerWidth : (containerWidth - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS

  const maxRow = layout.reduce((acc, w) => Math.max(acc, w.row + w.h - 1), 0)
  const gridH = maxRow * (GRID_ROW_H + GRID_GAP) - GRID_GAP

  const activeIds = new Set(layout.map(w => w.id))
  const removedWidgets = DEFAULT_LAYOUT.filter(w => !activeIds.has(w.id))

  function removeWidget(id: string) {
    setLayout(l => l.filter(w => w.id !== id))
  }

  function addWidget(id: string) {
    const def = DEFAULT_LAYOUT.find(w => w.id === id)
    if (!def) return
    setLayout(l => resolveCollisions([...l, { ...def, col: 1, row: 1 }]))
    setShowAdd(false)
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT)
  }

  const handleDragDown = useCallback((id: string, e: React.PointerEvent) => {
    if (narrow) return
    e.preventDefault()
    const w = layout.find(x => x.id === id)
    if (!w) return
    setDragging(id); setLifted(id)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startCol: w.col, startRow: w.row }

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      const dcol = Math.round(dx / (cellW + GRID_GAP))
      const drow = Math.round(dy / (GRID_ROW_H + GRID_GAP))
      setLayout(l => resolveCollisions(l.map(x => x.id === id ? {
        ...x,
        col: Math.max(1, Math.min(GRID_COLS - x.w + 1, dragRef.current!.startCol + dcol)),
        row: Math.max(1, dragRef.current!.startRow + drow),
      } : x)))
    }
    const onUp = () => {
      setDragging(null); setLifted(null); dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [layout, narrow, cellW])

  const handleResizeDown = useCallback((id: string, e: React.PointerEvent) => {
    if (narrow) return
    e.preventDefault()
    const w = layout.find(x => x.id === id)
    if (!w) return
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: w.w, startH: w.h, id }

    const onMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return
      const dx = ev.clientX - resizeRef.current.startX
      const dy = ev.clientY - resizeRef.current.startY
      const dw = Math.round(dx / (cellW + GRID_GAP))
      const dh = Math.round(dy / (GRID_ROW_H + GRID_GAP))
      setLayout(l => l.map(x => x.id === id ? {
        ...x,
        w: Math.max(1, Math.min(GRID_COLS - x.col + 1, resizeRef.current!.startW + dw)),
        h: Math.max(1, Math.min(GRID_MAX_H, resizeRef.current!.startH + dh)),
      } : x))
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [layout, narrow, cellW])

  return (
    <div style={{ paddingTop: 62, height: '100vh', overflow: 'hidden auto', background: 'radial-gradient(120% 100% at 50% 0%, oklch(0.205 0.007 70), var(--bg-void))' }}>
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {getGreeting(user?.full_name?.split(' ')[0] ?? 'there')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 3 }}>
              Level {user?.level ?? '—'} · {user ? Math.round((user.xp_to_next ?? 0) * 100) : '—'}% to next · 6 systems online.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={resetLayout} style={{ fontSize: 12 }}>
              <Icon name="refresh" size={13} /> Reset
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn" onClick={() => setShowAdd(v => !v)} style={{ fontSize: 12 }}>
                <Icon name="plus" size={13} /> Add widget
              </button>
              {showAdd && removedWidgets.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                  background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius-sm)', padding: 6, minWidth: 160,
                  boxShadow: 'var(--shadow-pop)',
                }}>
                  {removedWidgets.map(w => (
                    <button
                      key={w.id}
                      onClick={() => addWidget(w.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', background: 'none', border: 'none',
                        padding: '7px 10px', borderRadius: 7,
                        color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      className="subnav-item"
                    >
                      <Icon name={w.glyph} size={14} style={{ color: w.color }} />
                      {w.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div ref={containerRef} style={{ position: 'relative', height: gridH || 600 }}>
          {layout.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-faint)', fontSize: 14,
            }}>
              No widgets · add one →
            </div>
          )}
          {layout.map(w => (
            <div
              key={w.id}
              style={narrow
                ? { marginBottom: GRID_GAP, height: w.h * GRID_ROW_H + (w.h - 1) * GRID_GAP }
                : widgetStyle(w, cellW)
              }
            >
              <Widget
                title={w.title}
                color={w.color}
                glyph={w.glyph}
                lifted={lifted === w.id}
                dragging={dragging === w.id}
                onHandleDown={e => handleDragDown(w.id, e)}
                onResizeDown={e => handleResizeDown(w.id, e)}
                onRemove={() => removeWidget(w.id)}
              >
                <WidgetBody id={w.id} aiInput={aiInput} setAiInput={setAiInput} />
              </Widget>
            </div>
          ))}
        </div>
        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

function WidgetBody({ id, aiInput, setAiInput }: { id: string; aiInput: string; setAiInput: (v: string) => void }) {
  switch (id) {
    case 'net':    return <NetWorthWidget />
    case 'assets': return <AssetsWidget />
    case 'debt':   return <DebtWidget />
    case 'budget': return <BudgetWidget />
    case 'tasks':  return <TasksWidget />
    case 'focus':  return <TasksWidget showBoth />
    case 'habits': return <HabitsWidget />
    case 'notes':  return <NotesWidget />

    case 'ai': return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, flex: 1 }}>
          Ask me anything about your tasks, finances, or habits.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            placeholder="Ask Braosa AI…"
            style={{
              flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 12, padding: '7px 10px',
            }}
          />
          <button className="btn btn-accent" style={{ padding: '7px 10px', '--accent': 'var(--c-braosa)' } as React.CSSProperties}>
            <Icon name="send" size={13} />
          </button>
        </div>
      </div>
    )

    case 'weather': return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
        <Icon name="cloud" size={28} stroke={1.2} style={{ color: 'var(--c-dash)', opacity: 0.5 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Weather — coming soon</span>
      </div>
    )

    case 'health': return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
        <Icon name="pulse" size={28} stroke={1.2} style={{ color: 'var(--c-health)', opacity: 0.5 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Health — coming soon</span>
      </div>
    )

    default: return null
  }
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Icon from '@/components/os/Icon'

type HabitRow = {
  id: string
  name: string
  color: string | null
  done_today: boolean
  week_days: number[]
}

const GLYPHS = ['refresh', 'check', 'pulse', 'cloud', 'gem', 'mail', 'bolt']

export default function HabitsWidget() {
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/habits')
      .then(r => r.json())
      .then(d => setHabits((d.habits ?? []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const toggleToday = async (habitId: string) => {
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId }),
    })
    load()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Loading…</span>
    </div>
  )

  if (!habits.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6 }}>
      <Icon name="refresh" size={28} stroke={1.2} style={{ color: 'var(--c-cal)', opacity: 0.5 }} />
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No habits set up yet</span>
    </div>
  )

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, overflow: 'hidden' }}>
      {habits.map((h, idx) => (
        <div key={h.id} style={{
          background: 'var(--bg-raised-2)', borderRadius: 'var(--radius-sm)',
          padding: '7px 9px', border: '1px solid var(--edge)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name={GLYPHS[idx % GLYPHS.length]} size={13} style={{ color: 'var(--c-cal)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {h.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} title={d} style={{
                flex: 1, height: 10, borderRadius: 2,
                background: h.week_days[i] ? 'var(--c-cal)' : 'var(--bg-inset)',
              }} />
            ))}
          </div>
          <button
            onClick={() => toggleToday(h.id)}
            style={{
              background: h.done_today ? 'var(--c-cal)' : 'var(--bg-inset)',
              border: `1px solid ${h.done_today ? 'var(--c-cal)' : 'var(--edge)'}`,
              borderRadius: 4, padding: '2px 0', cursor: 'pointer',
              fontSize: 10, color: h.done_today ? 'oklch(0.17 0.01 80)' : 'var(--ink-faint)',
              transition: 'all .15s',
            }}
          >
            {h.done_today ? '✓ Done' : 'Mark'}
          </button>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/os/Icon'

type Task = { id: string; title: string; priority: number; system: string | null; due_date: string | null }

const PRIORITY_COLOR: Record<number, string> = {
  1: 'oklch(0.66 0.15 30 / 0.9)',
  2: 'oklch(0.74 0.13 60 / 0.9)',
  3: 'oklch(0.80 0.11 95 / 0.9)',
}
const PRIORITY_BG: Record<number, string> = {
  1: 'oklch(0.66 0.15 30 / 0.18)',
  2: 'oklch(0.74 0.13 60 / 0.18)',
  3: 'oklch(0.80 0.11 95 / 0.18)',
}

interface Props { showBoth?: boolean }

export default function TasksWidget({ showBoth = false }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => {
        const all = [
          ...(d.overdue ?? []),
          ...(d.today ?? []),
          ...(showBoth ? (d.upcoming ?? []) : []),
        ]
        setTasks(all.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [showBoth])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Loading…</span>
    </div>
  )

  if (!tasks.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6 }}>
      <Icon name="check" size={28} stroke={1.2} style={{ color: 'var(--c-task)', opacity: 0.5 }} />
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No tasks due — you&apos;re clear</span>
    </div>
  )

  return (
    <div style={{ overflow: 'hidden auto', maxHeight: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {tasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <div style={{
            width: 16, height: 16, border: '1.5px solid var(--edge-strong)',
            borderRadius: 4, flexShrink: 0, cursor: 'pointer',
          }} />
          <span style={{
            flex: 1, fontSize: 12, color: 'var(--ink-soft)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title}</span>
          {task.due_date && (
            <span style={{ fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>
              {task.due_date}
            </span>
          )}
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
            background: PRIORITY_BG[task.priority] ?? PRIORITY_BG[3],
            color: PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR[3],
          }}>P{task.priority}</span>
        </div>
      ))}
    </div>
  )
}

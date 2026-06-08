'use client'
import { useState } from 'react'
import type { Task } from '@/lib/tasks'
import { SYSTEM_COLORS } from '@/lib/tasks'
import { dueLabel } from '@/lib/date'
import { L, useLang } from '@/lib/i18n'
import { Icon, FavStar } from '@/components/ui'

type Props = {
  tasks: Task[]
  onSelect: (task: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
}

function PriorityBadge({ p }: { p: number }) {
  const color = p === 1 ? 'var(--p1)' : p === 2 ? 'var(--p2)' : 'var(--p3)'
  return (
    <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)', opacity: 0.85 }}>
      P{p}
    </span>
  )
}

function TaskRow({ task, onSelect, onToggleDone, onToggleFav }: {
  task: Task
  onSelect: (t: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
}) {
  const dl = dueLabel(task.due)
  const isDone = task.status === 'done'
  const systemColor = SYSTEM_COLORS[task.system ?? 'default'] ?? SYSTEM_COLORS.default

  return (
    <div
      onClick={() => onSelect(task)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 9, cursor: 'pointer', transition: 'background .12s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised-2)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleDone(task.id, e) }}
        style={{
          width: 19, height: 19, borderRadius: 6, flexShrink: 0,
          border: isDone ? 'none' : '1.5px solid var(--edge)',
          background: isDone ? 'var(--pos)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', transition: 'background .15s, border-color .15s',
        }}
      >
        {isDone && <Icon name="check" size={11} stroke={3} />}
      </button>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: systemColor, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: isDone ? 'var(--ink-faint)' : 'var(--ink-soft)', textDecoration: isDone ? 'line-through' : 'none' }}>
        {task.title}
      </span>
      {dl && (
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: dl.over ? 'var(--neg)' : dl.now ? 'var(--c-fin)' : 'var(--ink-faint)' }}>
          {dl.text}
        </span>
      )}
      <span onClick={e => e.stopPropagation()}>
        <FavStar on={task.fav} onClick={() => onToggleFav(task.id)} size={13} />
      </span>
      <PriorityBadge p={task.priority} />
    </div>
  )
}

function Section({ label, labelColor, tasks, onSelect, onToggleDone, onToggleFav }: {
  label: string; labelColor: string; tasks: Task[]
  onSelect: (t: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  if (tasks.length === 0) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ display: 'flex', color: 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
          <Icon name="chevron-right" size={14} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: labelColor }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', background: 'var(--bg-raised-2)', borderRadius: 99, padding: '1px 6px' }}>
          {tasks.length}
        </span>
      </div>
      {open && tasks.map(t => (
        <TaskRow key={t.id} task={t} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} />
      ))}
    </div>
  )
}

export default function TodayView({ tasks, onSelect, onToggleDone, onToggleFav }: Props) {
  useLang()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)

  const overdue = tasks.filter(t => t.status !== 'done' && t.due && new Date(t.due) < today)
  const todayTasks = tasks.filter(t => t.status !== 'done' && t.due && new Date(t.due) >= today && new Date(t.due) < tomorrow)
  const thisWeek = tasks.filter(t => t.status !== 'done' && t.due && new Date(t.due) >= tomorrow && new Date(t.due) < nextWeek)
  const noDate = tasks.filter(t => t.status !== 'done' && !t.due && (t.fav || t.priority <= 2))

  const hasAny = overdue.length + todayTasks.length + thisWeek.length + noDate.length > 0

  return (
    <div style={{ padding: '16px 20px', maxWidth: 720, overflowY: 'auto', flex: 1 }}>
      {!hasAny && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
          {L("Nada por aqui hoje.", "Nothing here today.")}
        </div>
      )}
      <Section label={L("Atrasadas", "Overdue")} labelColor="var(--neg)" tasks={overdue} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} />
      <Section label={L("Hoje", "Today")} labelColor="var(--c-fin)" tasks={todayTasks} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} />
      <Section label={L("Esta Semana", "This Week")} labelColor="var(--ink-soft)" tasks={thisWeek} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} />
      <Section label={L("Favoritos / Alta Prioridade", "Favourites / High Priority")} labelColor="var(--ink-soft)" tasks={noDate} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} />
    </div>
  )
}

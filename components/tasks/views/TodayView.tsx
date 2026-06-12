'use client'
import { useState } from 'react'
import type { Task } from '@/lib/tasks'
import { SYSTEM_COLORS } from '@/lib/tasks'
import { dueLabel } from '@/lib/date'
import { L, useLang } from '@/lib/i18n'
import { Icon, FavStar } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

type Props = {
  tasks: Task[]
  onSelect: (task: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
}

function PriorityBadge({ p, mobile }: { p: number; mobile?: boolean }) {
  if (mobile) {
    const bg = p === 1 ? '#E05C3A20' : p === 2 ? '#D4A84320' : '#8B5CF620'
    const color = p === 1 ? '#E05C3A' : p === 2 ? '#D4A843' : '#8B5CF6'
    return (
      <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)', background: bg, borderRadius: 99, padding: '2px 6px' }}>
        P{p}
      </span>
    )
  }
  const color = p === 1 ? 'var(--p1)' : p === 2 ? 'var(--p2)' : 'var(--p3)'
  return (
    <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)', opacity: 0.85 }}>
      P{p}
    </span>
  )
}

function TaskRow({ task, onSelect, onToggleDone, onToggleFav, isMobile }: {
  task: Task
  onSelect: (t: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
  isMobile: boolean
}) {
  const dl = dueLabel(task.due)
  const isDone = task.status === 'done'
  const systemColor = SYSTEM_COLORS[task.system ?? 'default'] ?? SYSTEM_COLORS.default

  if (isMobile) {
    return (
      <div
        onClick={() => onSelect(task)}
        style={{
          minHeight: 52,
          padding: '12px 16px',
          background: '#1e1b18',
          borderRadius: 10,
          marginBottom: 8,
          border: '1px solid #2a2520',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
        }}
      >
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleDone(task.id, e) }}
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            border: isDone ? 'none' : '1.5px solid #3a3530',
            background: isDone ? '#8B5CF6' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}
        >
          {isDone && <Icon name="check" size={14} stroke={3} />}
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: isDone ? '#94A3B8' : '#E8E0D5', textDecoration: isDone ? 'line-through' : 'none' }}>
          {task.title}
        </span>
        {dl && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: dl.over ? '#E05C3A' : '#94A3B8' }}>
            {dl.text}
          </span>
        )}
        <PriorityBadge p={task.priority} mobile />
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(task)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 9, cursor: 'pointer', transition: 'background .12s', minHeight: 48 }}
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

function Section({ label, labelColor, tasks, onSelect, onToggleDone, onToggleFav, isMobile }: {
  label: string; labelColor: string; tasks: Task[]
  onSelect: (t: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
  isMobile: boolean
}) {
  const [open, setOpen] = useState(true)
  if (tasks.length === 0) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer', userSelect: 'none', minHeight: 44 }}
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
        <TaskRow key={t.id} task={t} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      ))}
    </div>
  )
}

export default function TodayView({ tasks, onSelect, onToggleDone, onToggleFav }: Props) {
  useLang()
  const isMobile = useIsMobile()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)

  const overdue = tasks.filter(t => t.status !== 'done' && t.due && new Date(t.due) < today)
  const todayTasks = tasks.filter(t => t.status !== 'done' && t.due && new Date(t.due) >= today && new Date(t.due) < tomorrow)
  const thisWeek = tasks.filter(t => t.status !== 'done' && t.due && new Date(t.due) >= tomorrow && new Date(t.due) < nextWeek)
  const noDate = tasks.filter(t => t.status !== 'done' && !t.due && (t.fav || t.priority <= 2))

  const hasAny = overdue.length + todayTasks.length + thisWeek.length + noDate.length > 0

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '16px 20px', maxWidth: 720, overflowY: 'auto', flex: 1, background: '#161310', ...(isMobile ? { minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' } : {}) }}>
      {!hasAny && (
        isMobile ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px', width: '100%' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#8B5CF620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', margin: '0 auto 20px' }}>
              <Icon name="target" size={40} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#E8E0D5', textAlign: 'center' }}>
              {L("Nada para hoje", "Nothing for today")}
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
              {L("Adiciona uma tarefa com o +", "Add a task with the +")}
            </div>
          </div>
        ) : (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
            {L("Nada por aqui hoje.", "Nothing here today.")}
          </div>
        )
      )}
      <Section label={L("Atrasadas", "Overdue")} labelColor="var(--neg)" tasks={overdue} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      <Section label={L("Hoje", "Today")} labelColor="var(--c-fin)" tasks={todayTasks} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      <Section label={L("Esta Semana", "This Week")} labelColor="var(--ink-soft)" tasks={thisWeek} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      <Section label={L("Favoritos / Alta Prioridade", "Favourites / High Priority")} labelColor="var(--ink-soft)" tasks={noDate} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
    </div>
  )
}

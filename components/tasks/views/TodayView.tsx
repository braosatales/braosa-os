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
    const bg = p === 1 ? '#EF444415' : p === 2 ? '#F59E0B15' : '#8B5CF615'
    const color = p === 1 ? '#EF4444' : p === 2 ? '#F59E0B' : '#8B5CF6'
    return (
      <span style={{ fontSize: 11, color, fontWeight: 600, background: bg, borderRadius: 6, padding: '2px 8px' }}>
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
          padding: '14px 16px',
          background: '#1C1E26',
          borderRadius: 12,
          marginBottom: 8,
          border: '1px solid #2A2D3A',
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
            width: 26, height: 26, borderRadius: 99, flexShrink: 0,
            border: isDone ? '2px solid #22C55E' : '2px solid #363A4A',
            background: isDone ? '#22C55E' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}
        >
          {isDone && <Icon name="check" size={13} stroke={3} />}
        </button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: isDone ? '#555968' : '#F0F1F4', textDecoration: isDone ? 'line-through' : 'none' }}>
          {task.title}
        </span>
        {dl && (
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: dl.over ? '#EF4444' : '#8B909E' }}>
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
        <span style={{ display: 'flex', color: isMobile ? '#555968' : 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
          <Icon name="chevron-right" size={14} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: labelColor }}>{label}</span>
        <span style={{ fontSize: 11, color: isMobile ? '#8B909E' : 'var(--ink-faint)', fontFamily: 'var(--font-mono)', background: isMobile ? '#1C1E26' : 'var(--bg-raised-2)', borderRadius: 99, padding: '1px 6px' }}>
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
    <div
      className={isMobile ? 'mobile-page' : undefined}
      style={isMobile ? {
        padding: '16px 12px',
        width: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box' as const,
        margin: 0,
        overflowY: 'auto',
        flex: 1,
        overscrollBehavior: 'contain',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column' as const,
      } : {
        padding: '16px 20px',
        width: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box' as const,
        margin: 0,
        overflowY: 'auto',
        flex: 1,
        overscrollBehavior: 'contain',
      }}
    >
      {!hasAny && (
        isMobile ? (
          <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#1C1E26', border: '1px solid #2A2D3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', margin: '0 auto 20px' }}>
              <Icon name="target" size={32} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#F0F1F4', textAlign: 'center', marginBottom: 8 }}>
              {L("Nada para hoje", "Nothing for today")}
            </div>
            <div style={{ fontSize: 14, color: '#8B909E', textAlign: 'center' }}>
              {L("Adiciona uma tarefa com o +", "Add a task with the +")}
            </div>
          </div>
        ) : (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
            {L("Nada por aqui hoje.", "Nothing here today.")}
          </div>
        )
      )}
      <Section label={L("Atrasadas", "Overdue")} labelColor={isMobile ? '#EF4444' : 'var(--neg)'} tasks={overdue} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      <Section label={L("Hoje", "Today")} labelColor={isMobile ? '#F59E0B' : 'var(--c-fin)'} tasks={todayTasks} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      <Section label={L("Esta Semana", "This Week")} labelColor={isMobile ? '#8B909E' : 'var(--ink-soft)'} tasks={thisWeek} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
      <Section label={L("Favoritos / Alta Prioridade", "Favourites / High Priority")} labelColor={isMobile ? '#8B909E' : 'var(--ink-soft)'} tasks={noDate} onSelect={onSelect} onToggleDone={onToggleDone} onToggleFav={onToggleFav} isMobile={isMobile} />
    </div>
  )
}

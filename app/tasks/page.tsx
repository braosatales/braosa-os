'use client'

import { useState, useEffect, useCallback } from 'react'
import Icon from '@/components/os/Icon'
import Ring from '@/components/os/Ring'

const SUBNAV = [
  { id: 'today',    label: 'Today',     glyph: 'target' },
  { id: 'projects', label: 'Projects',  glyph: 'gem' },
  { id: 'habits',   label: 'Habits',    glyph: 'refresh' },
  { id: 'ai',       label: 'Braosa AI', glyph: 'spark' },
]

const SYSTEMS: Record<string, { color: string; dim: string }> = {
  personal:  { color: 'var(--c-dash)',   dim: 'var(--c-dash-dim)' },
  finances:  { color: 'var(--c-fin)',    dim: 'var(--c-fin-dim)' },
  health:    { color: 'var(--c-health)', dim: 'var(--c-health-dim)' },
  email:     { color: 'var(--c-mail)',   dim: 'var(--c-mail-dim)' },
  calendar:  { color: 'var(--c-cal)',    dim: 'var(--c-cal-dim)' },
  braosa:    { color: 'var(--c-braosa)', dim: 'var(--c-braosa-dim)' },
  verum:     { color: 'var(--c-verum)',  dim: 'var(--c-verum-dim)' },
}

type Task = { id: string; title: string; priority: number; system: string | null; due_date: string | null; status: string }
type Project = { id: string; name: string; world: string | null; status: string; next_action: string | null; deadline: string | null }
type HabitRow = { id: string; name: string; done_today: boolean; week_days: number[] }

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function TasksPage() {
  const [active, setActive] = useState('today')

  return (
    <div style={{ paddingTop: 62, height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <aside style={{
        width: 188, flexShrink: 0, height: '100%',
        background: 'var(--bg-base)', borderRight: '1px solid var(--edge-soft)',
        padding: '18px 8px', display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 8px 10px' }}>
          Tasks
        </div>
        {SUBNAV.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="subnav-item"
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', border: 'none',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              textAlign: 'left', transition: 'all .12s ease',
              color: active === item.id ? 'var(--c-task)' : 'var(--ink-dim)',
              background: active === item.id ? 'var(--c-task-dim)' : 'transparent',
              borderLeft: active === item.id ? '2px solid var(--c-task)' : '2px solid transparent',
            } as React.CSSProperties}
          >
            <Icon name={item.glyph} size={14} />
            {item.label}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {active === 'today' && <TodaySection />}
        {active === 'projects' && <ProjectsSection />}
        {active === 'habits' && <HabitsSection />}
        {active === 'ai' && <AiSection />}
      </main>

      <aside className="fin-rail" style={{
        width: 336, flexShrink: 0, height: '100%',
        background: 'var(--bg-base)', borderLeft: '1px solid var(--edge-soft)',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="spark" size={15} style={{ color: 'var(--c-braosa)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Braosa AI</span>
        </div>
        <div style={{
          background: 'var(--bg-raised)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--edge)', padding: '12px 14px',
          fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6,
        }}>
          Ask me about your tasks and I&apos;ll help you prioritize.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <input
            placeholder="Ask about your tasks…"
            style={{
              flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 12,
              padding: '8px 12px',
            }}
          />
          <button className="btn btn-accent" style={{ padding: '8px 10px', '--accent': 'var(--c-braosa)' } as React.CSSProperties}>
            <Icon name="send" size={13} />
          </button>
        </div>
      </aside>
    </div>
  )
}

function TodaySection() {
  const [tasks, setTasks] = useState<{ today: Task[]; overdue: Task[]; upcoming: Task[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>

  const allTasks = [
    ...(tasks?.overdue ?? []),
    ...(tasks?.today ?? []),
    ...(tasks?.upcoming ?? []),
  ]

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>
        Today&apos;s focus
      </h2>
      {allTasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
          <Icon name="check" size={40} stroke={1.2} style={{ marginBottom: 14, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>Nothing due — you&apos;re clear</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allTasks.map(task => {
            const sys = SYSTEMS[task.system ?? '']
            const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0]
            return (
              <div key={task.id} className="task-row" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--edge)', background: 'var(--bg-raised)',
              }}>
                <div className="task-check" style={{
                  width: 18, height: 18, border: '1.5px solid var(--edge-strong)',
                  borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-soft)' }}>{task.title}</span>
                {sys && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: sys.dim, color: sys.color }}>
                    {task.system}
                  </span>
                )}
                {task.due_date && (
                  <span style={{ fontSize: 12, color: isOverdue ? 'var(--neg)' : 'var(--ink-faint)', minWidth: 70, textAlign: 'right' }}>
                    {isOverdue ? 'Overdue' : task.due_date}
                  </span>
                )}
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  background: task.priority === 1 ? 'oklch(0.66 0.15 30 / 0.18)' : task.priority === 2 ? 'oklch(0.74 0.13 60 / 0.18)' : 'oklch(0.80 0.11 95 / 0.18)',
                  color: task.priority === 1 ? 'var(--p1)' : task.priority === 2 ? 'var(--p2)' : 'var(--p3)',
                }}>P{task.priority}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Projects</h2>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
          <Icon name="gem" size={40} stroke={1.2} style={{ marginBottom: 14, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No active projects</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => {
            const sys = SYSTEMS[p.world ?? '']
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 18px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--edge)', background: 'var(--bg-raised)',
              }}>
                <Ring value={p.status === 'done' ? 1 : 0.3} color={sys?.color ?? 'var(--ink-dim)'} size={46} stroke={4} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                  {p.next_action && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>Next: {p.next_action}</div>
                  )}
                  {sys && (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: sys.dim, color: sys.color, display: 'inline-block', marginTop: 4 }}>
                      {p.world}
                    </span>
                  )}
                </div>
                {p.deadline && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'right' }}>
                    <Icon name="cal" size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {p.deadline}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HabitsSection() {
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/habits')
      .then(r => r.json())
      .then(d => setHabits(d.habits ?? []))
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

  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Habits</h2>
      {habits.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
          <Icon name="refresh" size={40} stroke={1.2} style={{ marginBottom: 14, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No habits set up yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {habits.map(h => (
            <div key={h.id} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)', padding: '16px 18px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>{h.name}</div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                {DAY_LABELS.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: 24, borderRadius: 5,
                      background: h.week_days[i] ? 'var(--c-cal)' : 'var(--bg-inset)',
                      marginBottom: 4,
                    }} />
                    <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>{d}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => toggleToday(h.id)}
                className="btn"
                style={{
                  width: '100%', justifyContent: 'center', fontSize: 12,
                  background: h.done_today ? 'var(--c-cal)' : undefined,
                  color: h.done_today ? 'oklch(0.17 0.01 80)' : undefined,
                  border: h.done_today ? '1px solid var(--c-cal)' : undefined,
                }}
              >
                {h.done_today ? '✓ Done today' : 'Mark today'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AiSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Braosa AI</h2>
      <div style={{
        background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--edge)',
        padding: '16px 20px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6,
      }}>
        Ask me anything about your tasks, projects, or habits and I&apos;ll help you prioritize.
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Icon from '@/components/os/Icon'
import Ring from '@/components/os/Ring'
import { PLACEHOLDER_TASKS, SYSTEMS } from '@/lib/data'

const SUBNAV = [
  { id: 'today',    label: 'Today',     glyph: 'target' },
  { id: 'projects', label: 'Projects',  glyph: 'gem' },
  { id: 'habits',   label: 'Habits',    glyph: 'refresh' },
  { id: 'ai',       label: 'Braosa AI', glyph: 'spark' },
]

const PROJECTS = [
  { id: 'irs',  name: 'Fechar o IRS 2025',       system: 'finances',  done: 0, total: 1, due: '19 Jun' },
  { id: 'race', name: 'Meia-maratona de outubro', system: 'health',    done: 1, total: 2, due: '10 Aug' },
  { id: 'site', name: 'Lançar site da Braosa',    system: 'braosa',    done: 0, total: 2, due: '5 Jul' },
]

const HABITS = [
  { id: 'agua',    name: 'Beber 2L de água',  glyph: 'cloud',   streak: 6,  days: [1,1,1,1,1,1,0] },
  { id: 'ler',     name: 'Ler 20 min',        glyph: 'gem',     streak: 9,  days: [1,1,1,1,1,0,1] },
  { id: 'inbox',   name: 'Inbox zero',        glyph: 'mail',    streak: 4,  days: [1,1,1,1,0,0,0] },
  { id: 'mexer',   name: 'Mexer o corpo',     glyph: 'pulse',   streak: 12, days: [1,1,1,1,1,1,1] },
]

const DAY_LABELS = ['T', 'W', 'T', 'F', 'S', 'S', 'M']

export default function TasksPage() {
  const [active, setActive] = useState('today')

  return (
    <div style={{ paddingTop: 62, height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Left sidebar */}
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

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {active === 'today' && <TodaySection />}
        {active === 'projects' && <ProjectsSection />}
        {active === 'habits' && <HabitsSection />}
        {active === 'ai' && <AiSection />}
      </main>

      {/* Right AI rail */}
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
          You have 2 overdue tasks. Want me to reschedule them based on your calendar availability?
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
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
          Today&apos;s focus · what moves the needle
        </h2>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10,
          background: 'var(--c-task-dim)', border: '1px solid var(--c-task)',
          borderRadius: 'var(--radius-sm)', padding: '6px 12px',
        }}>
          <Icon name="bolt" size={13} style={{ color: 'var(--c-task)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-task)' }}>+275 XP this week</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PLACEHOLDER_TASKS.map(task => {
          const sys = SYSTEMS.find(s => s.label.toLowerCase() === task.tag.toLowerCase())
          return (
            <div key={task.id} className="task-row" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--edge)', background: 'var(--bg-raised)',
              transition: 'background .12s',
            }}>
              <div className="task-check" style={{
                width: 18, height: 18, border: '1.5px solid var(--edge-strong)',
                borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                transition: 'border-color .15s',
              }} />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-soft)' }}>{task.title}</span>
              {sys && (
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 5,
                  background: sys.dim, color: sys.color,
                }}>{sys.label}</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--ink-faint)', minWidth: 60, textAlign: 'right' }}>{task.due}</span>
              <button className="favbtn" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: task.fav ? 'var(--c-fin)' : 'var(--ink-faint)',
                transition: 'color .15s, transform .15s',
              }}>
                <Icon name="star" size={14} />
              </button>
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: task.p === 1 ? 'oklch(0.66 0.15 30 / 0.18)' : task.p === 2 ? 'oklch(0.74 0.13 60 / 0.18)' : 'oklch(0.80 0.11 95 / 0.18)',
                color: task.p === 1 ? 'var(--p1)' : task.p === 2 ? 'var(--p2)' : 'var(--p3)',
              }}>P{task.p}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectsSection() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Projects</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PROJECTS.map(p => {
          const sys = SYSTEMS.find(s => s.id === p.system)
          const pct = p.total ? p.done / p.total : 0
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 18px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--edge)', background: 'var(--bg-raised)',
            }}>
              <Ring value={pct} color={sys?.color ?? 'var(--ink-dim)'} size={46} stroke={4} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  {sys && (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: sys.dim, color: sys.color }}>
                      {sys.label}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{p.done}/{p.total} tasks</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'right' }}>
                <Icon name="cal" size={12} style={{ display: 'inline', marginRight: 4 }} />
                {p.due}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HabitsSection() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Habits</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {HABITS.map(h => (
          <div key={h.id} style={{
            background: 'var(--bg-raised)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius)', padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--c-cal-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={h.glyph} size={16} style={{ color: 'var(--c-cal)' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{h.name}</div>
                <div style={{ fontSize: 12, color: 'var(--c-cal)' }}>{h.streak}-day streak</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                }}>
                  <div style={{
                    height: 24, borderRadius: 5,
                    background: h.days[i] ? 'var(--c-cal)' : 'var(--bg-inset)',
                    marginBottom: 4,
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>{d}</span>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
              Mark today
            </button>
          </div>
        ))}
      </div>
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
        You have 2 overdue tasks. Want me to reschedule them based on your calendar availability?
      </div>
    </div>
  )
}

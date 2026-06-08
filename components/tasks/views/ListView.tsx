'use client'
import { useState, useMemo } from 'react'
import type { Task } from '@/lib/tasks'
import { SYSTEM_COLORS } from '@/lib/tasks'
import { dueLabel } from '@/lib/date'
import { L, useLang } from '@/lib/i18n'
import { Icon, FavStar, Chip } from '@/components/ui'
import { TaskStore } from '@/lib/task-store'

type SortKey = 'priority' | 'due' | 'title' | 'fav' | 'created_at'
type SortDir = 'asc' | 'desc'
type GroupBy = 'none' | 'project' | 'system'

type Props = {
  tasks: Task[]
  onSelect: (t: Task) => void
  onToggleDone: (id: string, e: React.MouseEvent) => void
  onToggleFav: (id: string) => void
}

function PriorityBadge({ p }: { p: number }) {
  const color = p === 1 ? 'var(--p1)' : p === 2 ? 'var(--p2)' : 'var(--p3)'
  return <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>P{p}</span>
}

const COL = '28px 1fr 120px 80px 70px 80px 28px'

function SortHeader({ label, sortKey, active, dir, onClick }: { label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: active ? 'var(--ink-soft)' : 'var(--ink-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, userSelect: 'none' }}
    >
      {label}
      {active && (
        <span style={{ display: 'flex', color: 'var(--c-task)' }}>
          <Icon name={dir === 'asc' ? 'chevron-up' : 'chevron-down'} size={11} />
        </span>
      )}
    </div>
  )
}

export default function ListView({ tasks, onSelect, onToggleDone, onToggleFav }: Props) {
  useLang()
  const projects = TaskStore.getProjects()
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...tasks]
    arr.sort((a, b) => {
      let va: string | number | boolean, vb: string | number | boolean
      switch (sortKey) {
        case 'priority': va = a.priority; vb = b.priority; break
        case 'due': va = a.due ?? '9999'; vb = b.due ?? '9999'; break
        case 'title': va = a.title.toLowerCase(); vb = b.title.toLowerCase(); break
        case 'fav': va = a.fav ? 0 : 1; vb = b.fav ? 0 : 1; break
        case 'created_at': va = a.created_at; vb = b.created_at; break
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [tasks, sortKey, sortDir])

  const groups: { key: string; label: string; items: Task[] }[] = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', items: sorted }]
    if (groupBy === 'project') {
      const map = new Map<string, Task[]>()
      for (const t of sorted) {
        const k = t.project_id ?? '__none'
        if (!map.has(k)) map.set(k, [])
        map.get(k)!.push(t)
      }
      return [...map.entries()].map(([k, items]) => {
        const proj = projects.find(p => p.id === k)
        return { key: k, label: proj?.name ?? L('Sem Projeto', 'No Project'), items }
      })
    }
    // groupBy === 'system'
    const map = new Map<string, Task[]>()
    for (const t of sorted) {
      const k = t.system ?? '__none'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    }
    return [...map.entries()].map(([k, items]) => ({
      key: k, label: k === '__none' ? L('Sem Sistema', 'No System') : k, items,
    }))
  }, [sorted, groupBy, projects])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--edge-soft)', flexShrink: 0 }}>
        <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
          {L("AGRUPAR", "GROUP")}
        </span>
        {(['none', 'project', 'system'] as GroupBy[]).map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--edge-soft)', cursor: 'pointer', background: groupBy === g ? 'var(--c-task-dim)' : 'transparent', color: groupBy === g ? 'var(--c-task)' : 'var(--ink-faint)', transition: 'all .12s' }}
          >
            {g === 'none' ? L('Nenhum', 'None') : g === 'project' ? L('Projeto', 'Project') : L('Sistema', 'System')}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--edge)', flexShrink: 0 }}>
        <div />
        <SortHeader label={L("TÍTULO", "TITLE")} sortKey="title" active={sortKey === 'title'} dir={sortDir} onClick={() => handleSort('title')} />
        <SortHeader label={L("PROJETO", "PROJECT")} sortKey="priority" active={false} dir={sortDir} onClick={() => {}} />
        <SortHeader label={L("SISTEMA", "SYSTEM")} sortKey="priority" active={false} dir={sortDir} onClick={() => {}} />
        <SortHeader label={L("PRIORIDADE", "PRIORITY")} sortKey="priority" active={sortKey === 'priority'} dir={sortDir} onClick={() => handleSort('priority')} />
        <SortHeader label={L("DATA", "DUE")} sortKey="due" active={sortKey === 'due'} dir={sortDir} onClick={() => handleSort('due')} />
        <SortHeader label="★" sortKey="fav" active={sortKey === 'fav'} dir={sortDir} onClick={() => handleSort('fav')} />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map(group => (
          <div key={group.key}>
            {groupBy !== 'none' && (
              <div style={{ padding: '12px 16px 4px', fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {group.label}
              </div>
            )}
            {group.items.map(task => {
              const dl = dueLabel(task.due)
              const isDone = task.status === 'done'
              const proj = projects.find(p => p.id === task.project_id)
              const systemColor = SYSTEM_COLORS[task.system ?? 'default'] ?? SYSTEM_COLORS.default

              return (
                <div
                  key={task.id}
                  onClick={() => onSelect(task)}
                  style={{ display: 'grid', gridTemplateColumns: COL, alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised-2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  {/* Check */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onToggleDone(task.id, e) }}
                    style={{
                      width: 19, height: 19, borderRadius: 6, border: isDone ? 'none' : '1.5px solid var(--edge)',
                      background: isDone ? 'var(--pos)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', flexShrink: 0,
                    }}
                  >
                    {isDone && <Icon name="check" size={11} stroke={3} />}
                  </button>

                  {/* Title + tags */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                    <span style={{ fontSize: 13, color: isDone ? 'var(--ink-faint)' : 'var(--ink-soft)', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </span>
                    {task.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {task.tags.map(tag => <Chip key={tag} label={tag} />)}
                      </div>
                    )}
                  </div>

                  {/* Project */}
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj?.name ?? '—'}
                  </span>

                  {/* System */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {task.system && <span style={{ width: 6, height: 6, borderRadius: 99, background: systemColor, flexShrink: 0 }} />}
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.system ?? '—'}
                    </span>
                  </div>

                  {/* Priority */}
                  <PriorityBadge p={task.priority} />

                  {/* Due */}
                  {dl ? (
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: dl.over ? 'var(--neg)' : dl.now ? 'var(--c-fin)' : 'var(--ink-faint)' }}>
                      {dl.text}
                    </span>
                  ) : <span />}

                  {/* Fav */}
                  <span onClick={e => e.stopPropagation()}>
                    <FavStar on={task.fav} onClick={() => onToggleFav(task.id)} size={13} />
                  </span>
                </div>
              )
            })}
          </div>
        ))}

        {tasks.length === 0 && (
          <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
            {L("Nenhuma tarefa.", "No tasks.")}
          </div>
        )}
      </div>
    </div>
  )
}

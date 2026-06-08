'use client'
import { useState, useEffect } from 'react'
import type { Task, TaskStatus } from '@/lib/tasks'
import { SYSTEM_COLORS } from '@/lib/tasks'
import { dueLabel } from '@/lib/date'
import { L, useLang } from '@/lib/i18n'
import { Icon, FavStar } from '@/components/ui'
import { TaskStore } from '@/lib/task-store'
import AddTaskModal from '@/components/tasks/AddTaskModal'

const COLUMNS: { id: TaskStatus; color: string; labelPt: string; labelEn: string }[] = [
  { id: 'todo',  color: 'var(--c-task)', labelPt: 'A Fazer',      labelEn: 'To Do'       },
  { id: 'doing', color: 'var(--c-fin)',  labelPt: 'Em Progresso', labelEn: 'In Progress' },
  { id: 'done',  color: 'var(--pos)',    labelPt: 'Concluído',    labelEn: 'Done'        },
]

type Props = {
  tasks: Task[]
  onSelect: (task: Task) => void
}

function PriorityBadge({ p }: { p: number }) {
  const color = p === 1 ? 'var(--p1)' : p === 2 ? 'var(--p2)' : 'var(--p3)'
  return <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>P{p}</span>
}

export default function BoardView({ tasks, onSelect }: Props) {
  useLang()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingFrom, setDraggingFrom] = useState<TaskStatus | null>(null)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)
  const [addForStatus, setAddForStatus] = useState<TaskStatus | null>(null)

  useEffect(() => {
    if (!draggingId) return

    function onMove(e: PointerEvent) {
      setGhostPos({ x: e.clientX, y: e.clientY })
    }
    function onUp() {
      if (draggingId && overColumn && overColumn !== draggingFrom) {
        TaskStore.updateTask(draggingId, { status: overColumn })
      }
      setDraggingId(null)
      setDraggingFrom(null)
      setOverColumn(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draggingId, draggingFrom, overColumn])

  const ghostTask = draggingId ? tasks.find(t => t.id === draggingId) : null

  return (
    <div style={{ display: 'flex', gap: 16, padding: 20, overflowX: 'auto', height: '100%', alignItems: 'flex-start' }}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id)
        const isOver = draggingId && overColumn === col.id && draggingFrom !== col.id

        return (
          <div
            key={col.id}
            style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column' }}
            onPointerEnter={() => { if (draggingId) setOverColumn(col.id) }}
          >
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 2px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: col.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                {L(col.labelPt, col.labelEn)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', background: 'var(--bg-raised-2)', borderRadius: 99, padding: '1px 6px' }}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards container */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
              overflowY: 'auto', minHeight: 80, padding: '4px 0',
              borderRadius: 10,
              background: isOver ? 'oklch(0.70 0.125 292 / 0.06)' : 'transparent',
              transition: 'background .15s',
            }}>
              {colTasks.map(task => {
                const dl = dueLabel(task.due)
                const systemColor = SYSTEM_COLORS[task.system ?? 'default'] ?? SYSTEM_COLORS.default
                const isBeingDragged = draggingId === task.id
                return (
                  <div
                    key={task.id}
                    onClick={() => { if (!draggingId) onSelect(task) }}
                    onPointerDown={e => {
                      setDraggingId(task.id)
                      setDraggingFrom(task.status)
                      setOverColumn(task.status)
                      setGhostPos({ x: e.clientX, y: e.clientY })
                    }}
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--edge)',
                      borderRadius: 'var(--radius)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      opacity: isBeingDragged ? 0.35 : 1,
                      transition: 'border-color .15s, box-shadow .15s, opacity .15s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!draggingId) {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'var(--edge-strong)'
                        el.style.boxShadow = 'var(--shadow-card)'
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = 'var(--edge)'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <PriorityBadge p={task.priority} />
                      <span onClick={e => { e.stopPropagation() }}>
                        <FavStar on={task.fav} onClick={() => TaskStore.toggleFav(task.id)} size={13} />
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4, marginTop: 6 }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: systemColor, flexShrink: 0 }} />
                      {dl && (
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: dl.over ? 'var(--neg)' : dl.now ? 'var(--c-fin)' : 'var(--ink-faint)' }}>
                          {dl.text}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add button */}
            <button
              type="button"
              className="btn"
              onClick={() => setAddForStatus(col.id)}
              style={{ marginTop: 8, width: '100%', fontSize: 12, justifyContent: 'center', gap: 6 }}
            >
              <Icon name="plus" size={13} />
              {L("Adicionar", "Add")}
            </button>
          </div>
        )
      })}

      {/* Drag ghost */}
      {ghostTask && draggingId && (
        <div
          style={{
            position: 'fixed',
            left: ghostPos.x + 10,
            top: ghostPos.y - 20,
            width: 240,
            pointerEvents: 'none',
            zIndex: 9999,
            background: 'var(--bg-raised)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            opacity: 0.9,
            boxShadow: 'var(--shadow-pop)',
            fontSize: 13,
            color: 'var(--ink)',
            fontWeight: 500,
          }}
        >
          {ghostTask.title}
        </div>
      )}

      {addForStatus && (
        <AddTaskModal
          open={true}
          initialStatus={addForStatus}
          onClose={() => setAddForStatus(null)}
        />
      )}
    </div>
  )
}

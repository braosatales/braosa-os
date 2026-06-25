'use client'
import { useState, useEffect } from 'react'
import type { Task, TaskStatus } from '@/lib/tasks'
import { SYSTEM_COLORS } from '@/lib/tasks'
import { dueLabel } from '@/lib/date'
import { L, useLang } from '@/lib/i18n'
import { Icon, FavStar } from '@/components/ui'
import { TaskStore } from '@/lib/task-store'
import AddTaskModal from '@/components/tasks/AddTaskModal'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const COLUMNS: { id: TaskStatus; dot: string; labelPt: string; labelEn: string }[] = [
  { id: 'todo',  dot: '#8B909E', labelPt: 'A Fazer',      labelEn: 'To Do'       },
  { id: 'doing', dot: '#F59E0B', labelPt: 'Em Progresso', labelEn: 'In Progress' },
  { id: 'done',  dot: '#22C55E', labelPt: 'Concluído',    labelEn: 'Done'        },
]

type Props = {
  tasks: Task[]
  onSelect: (task: Task) => void
}

function PriorityBadge({ p, mobile }: { p: number; mobile?: boolean }) {
  if (mobile) {
    const bg = p === 1 ? '#EF444415' : p === 2 ? '#F59E0B15' : '#8B5CF615'
    const color = p === 1 ? '#EF4444' : p === 2 ? '#F59E0B' : '#8B5CF6'
    return <span style={{ fontSize: 11, color, fontWeight: 600, background: bg, borderRadius: 6, padding: '2px 8px' }}>P{p}</span>
  }
  const color = p === 1 ? 'var(--p1)' : p === 2 ? 'var(--p2)' : 'var(--p3)'
  return <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>P{p}</span>
}

export default function BoardView({ tasks, onSelect }: Props) {
  useLang()
  const isMobile = useIsMobile()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingFrom, setDraggingFrom] = useState<TaskStatus | null>(null)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)
  const [addForStatus, setAddForStatus] = useState<TaskStatus | null>(null)
  const [moveSheetTask, setMoveSheetTask] = useState<Task | null>(null)

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
    <div
      className={isMobile ? 'mobile-page' : undefined}
      style={isMobile ? {
        background: '#00CED1',
        width: '100%',
        minWidth: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box' as const,
        margin: 0,
        alignSelf: 'stretch',
        flex: '1 1 100%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        overflowX: 'hidden',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      } : {
      display: 'flex',
      gap: 16,
      padding: '20px',
      overflowX: 'auto',
      overflowY: 'hidden',
      height: '100%',
      alignItems: 'flex-start',
      flexDirection: 'row' as const,
      width: '100%',
      maxWidth: 'none',
      boxSizing: 'border-box' as const,
      margin: 0,
    }}>
      {/* Mobile move bottom sheet */}
      {isMobile && moveSheetTask && (
        <div
          onClick={() => setMoveSheetTask(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#1C1E26', borderRadius: '16px 16px 0 0',
              border: '1px solid #2A2D3A',
              padding: '20px 20px 40px',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F1F4', marginBottom: 16 }}>
              {L('Mover para...', 'Move to...')}
            </div>
            {COLUMNS.filter(c => c.id !== moveSheetTask.status).map(col => (
              <button
                key={col.id}
                onClick={() => {
                  TaskStore.updateTask(moveSheetTask.id, { status: col.id })
                  setMoveSheetTask(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '14px 0', background: 'none', border: 'none',
                  borderBottom: '1px solid #2A2D3A', cursor: 'pointer',
                  fontSize: 14, color: col.dot, fontWeight: 500,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 99, background: col.dot }} />
                {L(col.labelPt, col.labelEn)}
              </button>
            ))}
          </div>
        </div>
      )}

      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id)
        const isOver = draggingId && overColumn === col.id && draggingFrom !== col.id

        return (
          <div
            key={col.id}
            style={isMobile
              ? {
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  background: '#1C1E26',
                  border: '1px solid #2A2D3A',
                  borderRadius: 14,
                }
              : { flex: '0 0 280px', minWidth: 280, display: 'flex', flexDirection: 'column' }
            }
            onPointerEnter={() => { if (draggingId) setOverColumn(col.id) }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isMobile ? '14px 16px' : '0 2px',
              marginBottom: isMobile ? 0 : 12,
              borderBottom: isMobile ? '1px solid #2A2D3A' : 'none',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: col.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#F0F1F4', flex: 1 }}>
                {L(col.labelPt, col.labelEn)}
              </span>
              <span style={{ fontSize: 11, color: '#8B909E', fontFamily: 'var(--font-mono)', background: '#252830', borderRadius: 99, padding: '1px 6px' }}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards container */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
              overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 80, padding: isMobile ? '10px' : '4px 0',
              borderRadius: isMobile ? '0 0 14px 14px' : 10,
              background: isOver ? 'rgba(139,92,246,0.06)' : 'transparent',
              transition: 'background .15s',
            }}>
              {colTasks.map(task => {
                const dl = dueLabel(task.due)
                const systemColor = SYSTEM_COLORS[task.system ?? 'default'] ?? SYSTEM_COLORS.default
                const isBeingDragged = draggingId === task.id

                if (isMobile) {
                  return (
                    <div
                      key={task.id}
                      onClick={() => { if (!draggingId) onSelect(task) }}
                      style={{
                        background: '#252830',
                        border: '1px solid #2A2D3A',
                        borderRadius: 10,
                        padding: '12px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <PriorityBadge p={task.priority} mobile />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setMoveSheetTask(task) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555968', padding: '2px 4px', fontSize: 14 }}
                          >
                            •••
                          </button>
                          <span onClick={e => e.stopPropagation()}>
                            <FavStar on={task.fav} onClick={() => TaskStore.toggleFav(task.id)} size={13} />
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#F0F1F4', lineHeight: 1.4 }}>
                        {task.title}
                      </div>
                      {dl && (
                        <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--font-mono)', color: dl.over ? '#EF4444' : '#8B909E' }}>
                          {dl.text}
                        </div>
                      )}
                    </div>
                  )
                }

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
                      <span onClick={e => e.stopPropagation()}>
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

              {colTasks.length === 0 && isMobile && (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#555968' }}>
                  {L('Sem tarefas', 'No tasks')}
                </div>
              )}
            </div>

            {/* Add button */}
            <button
              type="button"
              className="btn-icon-mobile"
              onClick={() => setAddForStatus(col.id)}
              style={isMobile ? {
                width: '100%',
                height: 44,
                border: '1px dashed #363A4A',
                borderRadius: 10,
                background: 'transparent',
                color: '#8B909E',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                margin: '0 0 10px',
              } : {
                marginTop: 8, width: '100%', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, border: '1px dashed var(--edge)',
                background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer',
              }}
            >
              <Icon name="plus" size={13} />
              <span className="btn-label">{L("Adicionar", "Add")}</span>
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

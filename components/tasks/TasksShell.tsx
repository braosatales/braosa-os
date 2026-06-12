'use client'
import { useState, useContext } from 'react'
import { Icon, FavStar } from '@/components/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { L, useLang } from '@/lib/i18n'
import { MobileSubTabContext } from '@/lib/mobile-context'
import { useTaskStore, TaskStore } from '@/lib/task-store'
import type { Task, TaskView } from '@/lib/tasks'
import { burstConfetti } from '@/lib/confetti'
import TodayView from './views/TodayView'
import BoardView from './views/BoardView'
import ListView from './views/ListView'
import TaskDetailModal from './TaskDetailModal'
import AddTaskModal from './AddTaskModal'

const VIEWS: { id: TaskView; labelPt: string; labelEn: string; glyph: string }[] = [
  { id: 'today',    labelPt: 'Hoje',           labelEn: 'Today',    glyph: 'target'   },
  { id: 'board',    labelPt: 'Quadro',         labelEn: 'Board',    glyph: 'board'    },
  { id: 'list',     labelPt: 'Lista',          labelEn: 'List',     glyph: 'list'     },
  { id: 'timeline', labelPt: 'Linha do Tempo', labelEn: 'Timeline', glyph: 'timeline' },
]

const PROJECT_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706',
  '#DC2626', '#DB2777', '#0891B2', '#65A30D',
]

function AddProjectForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [saving, setSaving] = useState(false)
  useLang()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await TaskStore.addProject({ name: name.trim(), color })
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '8px 8px', borderRadius: 8, background: 'var(--bg-raised-2)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={L("Nome do projeto…", "Project name…")}
        style={{ width: '100%', fontSize: 12, border: 'none', borderBottom: '1px solid var(--edge)', background: 'transparent', color: 'var(--ink)', outline: 'none', padding: '3px 0', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {PROJECT_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            style={{ width: 16, height: 16, borderRadius: 99, background: c, border: color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--edge)', background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer' }}>
          {L("Cancelar", "Cancel")}
        </button>
        <button type="submit" disabled={!name.trim() || saving} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: 'none', background: 'var(--c-task)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {L("Criar", "Create")}
        </button>
      </div>
    </form>
  )
}

export default function TasksShell() {
  useLang()
  const isMobile = useIsMobile()
  const { activeSubTab: mobileSubTab, setSubTab: setMobileSubTab } = useContext(MobileSubTabContext)
  const { tasks, projects, loading } = useTaskStore()

  const [desktopView, setDesktopView] = useState<TaskView>('today')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const activeView = (isMobile ? (mobileSubTab as TaskView) || 'today' : desktopView)

  const handleSetView = (id: TaskView) => {
    if (isMobile) setMobileSubTab(id)
    else setDesktopView(id)
  }

  function handleToggleDone(id: string, e: React.MouseEvent) {
    const task = tasks.find(t => t.id === id)
    if (task && task.status !== 'done') {
      burstConfetti(e.clientX, e.clientY)
    }
    TaskStore.toggleDone(id)
  }

  function handleToggleFav(id: string) {
    TaskStore.toggleFav(id)
  }

  const nonCancelled = tasks.filter(t => t.status !== 'cancelled')
  const filteredTasks = selectedProjectId
    ? nonCancelled.filter(t => t.project_id === selectedProjectId)
    : nonCancelled

  function projectTaskCount(projectId: string) {
    return nonCancelled.filter(t => t.project_id === projectId).length
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>

      {/* Desktop left sidebar */}
      {!isMobile && (
        <div
          className="fin-sidebar"
          style={{
            width: 200,
            flexShrink: 0,
            background: 'linear-gradient(180deg, var(--bg-raised), transparent)',
            borderRight: '1px solid var(--edge-soft)',
            padding: '18px 10px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div
            className="subnav-label"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.18em', padding: '0 8px', marginBottom: 12 }}
          >
            {L("TAREFAS", "TASKS")}
          </div>

          {VIEWS.map(v => {
            const isActive = activeView === v.id
            return (
              <button
                key={v.id}
                className="subnav-item"
                onClick={() => { handleSetView(v.id); setSelectedProjectId(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: isActive ? '9px 10px 9px 8px' : '9px 10px',
                  borderRadius: 9, width: '100%', cursor: 'pointer', border: 'none',
                  background: isActive ? 'color-mix(in oklch, var(--c-task) 14%, transparent)' : 'transparent',
                  color: isActive ? 'var(--c-task)' : 'var(--ink-dim)',
                  borderLeft: isActive ? '2px solid var(--c-task)' : '2px solid transparent',
                  transition: 'all .15s',
                }}
              >
                <span style={{ display: 'flex', color: 'inherit' }}>
                  <Icon name={v.glyph as any} size={15} />
                </span>
                <span className="subnav-label" style={{ fontSize: 13, fontWeight: 500 }}>
                  {L(v.labelPt, v.labelEn)}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setShowAddTask(true)}
            style={{
              width: '100%', background: 'var(--c-task-dim)', border: '1px solid var(--c-task)',
              color: 'var(--c-task)', borderRadius: 'var(--radius-sm)', padding: '9px 13px',
              marginTop: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            <Icon name="plus" size={14} />
            {L("+ Nova Tarefa", "+ New Task")}
          </button>

          <div style={{ borderTop: '1px solid var(--edge-soft)', margin: '16px 0' }} />

          <div
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.18em', padding: '0 8px', marginBottom: 8 }}
          >
            {L("PROJETOS", "PROJECTS")}
          </div>

          {projects.map(proj => {
            const isActive = selectedProjectId === proj.id
            const count = projectTaskCount(proj.id)
            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(isActive ? null : proj.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                  background: isActive ? 'var(--bg-raised-2)' : 'transparent',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'oklch(0.265 0.008 72 / 0.5)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 99, background: proj.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: isActive ? 'var(--ink)' : 'var(--ink-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {proj.name}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                    {count}
                  </span>
                )}
              </div>
            )
          })}

          {showAddProject ? (
            <AddProjectForm onSave={() => setShowAddProject(false)} onCancel={() => setShowAddProject(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddProject(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 11, marginTop: 4 }}
            >
              <Icon name="plus" size={10} />
              {L("+ Novo Projeto", "+ New Project")}
            </button>
          )}

          {loading && (
            <div style={{ marginTop: 'auto', padding: '8px', fontSize: 10.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              {L("A carregar…", "Loading…")}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column', background: '#161310', minHeight: '100%' }}>
        {activeView === 'today' && (
          <TodayView tasks={filteredTasks} onSelect={setSelectedTask} onToggleDone={handleToggleDone} onToggleFav={handleToggleFav} />
        )}
        {activeView === 'board' && (
          <BoardView tasks={filteredTasks} onSelect={setSelectedTask} />
        )}
        {activeView === 'list' && (
          <ListView tasks={filteredTasks} onSelect={setSelectedTask} onToggleDone={handleToggleDone} onToggleFav={handleToggleFav} />
        )}
        {activeView === 'timeline' && (
          <div style={{ padding: 40, color: 'var(--ink-dim)', fontSize: 14 }}>
            {L("Linha do Tempo em breve.", "Timeline coming soon.")}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <button
          onClick={() => setShowAddTask(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)',
            right: 20,
            zIndex: 50,
            width: 52,
            height: 52,
            borderRadius: 99,
            background: '#8B5CF6',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 30px -6px #8B5CF6',
          }}
        >
          <Icon name="plus" size={22} />
        </button>
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
      {showAddTask && (
        <AddTaskModal open={true} onClose={() => setShowAddTask(false)} />
      )}
    </div>
  )
}

'use client'
import { useState, useEffect, useRef } from 'react'
import { Clock, Play } from 'lucide-react'
import { Modal, Icon, FavStar, Chip } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { relativeTime } from '@/lib/date'
import { TaskStore } from '@/lib/task-store'
import type { Task, TaskStatus, TaskPriority } from '@/lib/tasks'
import { SYSTEMS, COMPANIES } from '@/lib/constants'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

type Props = {
  task: Task
  onClose: () => void
}

const ALL_SYSTEMS = [
  ...SYSTEMS.map(s => ({ id: s.id, label: s.label })),
  ...COMPANIES.map(c => ({ id: c.id, label: c.label })),
]

const STATUS_OPTIONS: { id: TaskStatus; labelPt: string; labelEn: string; color: string }[] = [
  { id: 'todo',      labelPt: 'Em Espera',    labelEn: 'To Do',     color: 'var(--c-task)' },
  { id: 'doing',     labelPt: 'Em Progresso', labelEn: 'Doing',     color: 'var(--c-fin)'  },
  { id: 'done',      labelPt: 'Concluído', labelEn: 'Done',      color: 'var(--pos)'    },
  { id: 'cancelled', labelPt: 'Cancelado', labelEn: 'Cancelled', color: 'var(--ink-faint)' },
]

// Colors reused from BoardView's status dots (todo/doing/done) and this file's own
// delete-action red (cancelled), used for the mobile icon-only status pills.
const STATUS_MOBILE_COLOR: Record<TaskStatus, string> = {
  todo: '#8B909E',
  doing: '#F59E0B',
  done: '#22C55E',
  cancelled: 'var(--neg)',
}

const PRIORITY_OPTIONS: { v: TaskPriority; color: string; label: string; icon: 'arrow-up' | 'minus' | 'arrow-down' }[] = [
  { v: 1, color: 'var(--p1)', label: 'Alta', icon: 'arrow-up' },
  { v: 2, color: 'var(--p2)', label: 'Média', icon: 'minus' },
  { v: 3, color: 'var(--p3)', label: 'Baixa', icon: 'arrow-down' },
]

// Mobile icon-only priority pills use fixed red/yellow/green regardless of theme,
// matching the mobile status pill pattern (STATUS_MOBILE_COLOR) above.
const PRIORITY_MOBILE_COLOR: Record<TaskPriority, string> = {
  1: '#EF4444',
  2: '#EAB308',
  3: '#22C55E',
}

export default function TaskDetailModal({ task: initialTask, onClose }: Props) {
  useLang()
  const isMobile = useIsMobile()
  const projects = TaskStore.getProjects()
  const live = TaskStore.getTasks().find(t => t.id === initialTask.id) ?? initialTask

  const [title, setTitle] = useState(live.title)
  const [description, setDescription] = useState(live.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(live.status)
  const [priority, setPriority] = useState<TaskPriority>(live.priority)
  const [dueDate, setDueDate] = useState(live.due_date ?? '')
  const [dueTime, setDueTime] = useState(live.due_time ?? '')
  const [system, setSystem] = useState(live.system ?? '')
  const [projectId, setProjectId] = useState(live.project_id ?? '')
  const [isFavourite, setIsFavourite] = useState(live.is_favourite)
  const [tags, setTags] = useState<string[]>(live.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  const savedRef = useRef<Partial<Task>>({})

  useEffect(() => {
    setTitle(live.title)
    setDescription(live.description ?? '')
    setStatus(live.status)
    setPriority(live.priority)
    setDueDate(live.due_date ?? '')
    setDueTime(live.due_time ?? '')
    setSystem(live.system ?? '')
    setProjectId(live.project_id ?? '')
    setIsFavourite(live.is_favourite)
    setTags(live.tags ?? [])
  }, [live.id])

  function save(patch: Partial<Task>) {
    savedRef.current = { ...savedRef.current, ...patch }
    TaskStore.updateTask(live.id, patch)
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = tagInput.trim()
      if (t && !tags.includes(t)) {
        const next = [...tags, t]
        setTags(next)
        save({ tags: next })
      }
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    save({ tags: next })
  }

  function handleDelete() {
    if (confirm(L("Eliminar esta tarefa?", "Delete this task?"))) {
      TaskStore.deleteTask(live.id)
      onClose()
    }
  }

  return (
    <Modal open={true} onClose={onClose} width={560} fullScreenMobile>
      <div style={isMobile ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } : undefined}>
        {isMobile && (
          <div
            style={{
              flexShrink: 0,
              height: 'calc(52px + env(safe-area-inset-top))',
              paddingTop: 'env(safe-area-inset-top)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingLeft: 16,
              paddingRight: 16,
              borderBottom: '1px solid var(--edge-soft)',
            }}
          >
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => { if (title.trim() !== live.title) save({ title: title.trim() }) }}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 16.5,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: 'var(--ink)',
                outline: 'none',
                padding: 0,
              }}
            />
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-faint)',
              }}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )}

        <div
          style={
            isMobile
              ? { flex: 1, minHeight: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }
              : { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }
          }
        >
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            style={{
              alignSelf: 'flex-start',
              width: 32,
              height: 32,
              margin: '-8px 0 -8px -8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-faint)',
            }}
          >
            <Icon name="close" size={18} />
          </button>
        )}
        {/* Title (desktop only — on mobile it lives in the header row) */}
        {!isMobile && (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() !== live.title) save({ title: title.trim() }) }}
            style={{ width: '100%', fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 600, border: 'none', borderBottom: '1px solid var(--edge)', background: 'transparent', color: 'var(--ink)', padding: '8px 0', outline: 'none' }}
          />
        )}

        {/* Description */}
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); autoGrow(e.target) }}
          onBlur={() => { if (description !== (live.description ?? '')) save({ description: description || null }) }}
          placeholder={L("Descrição…", "Description…")}
          style={{ width: '100%', fontSize: 14, color: 'var(--ink-dim)', border: 'none', borderBottom: '1px solid var(--edge-soft)', background: 'transparent', resize: 'none', minHeight: 60, outline: 'none', fontFamily: 'inherit', padding: '4px 0' }}
        />

        {/* Status + Priority */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Estado */}
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>
                {L("ESTADO", "STATUS")}
              </label>
              <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 4 }}>
                {STATUS_OPTIONS.map(opt => {
                  const active = status === opt.id
                  const color = STATUS_MOBILE_COLOR[opt.id]
                  const label = L(opt.labelPt, opt.labelEn)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={() => { setStatus(opt.id); save({ status: opt.id }) }}
                      style={{
                        width: 32, height: 32, flexShrink: 0,
                        borderRadius: 8, border: `1px solid ${active ? color : 'var(--edge)'}`,
                        background: active ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
                        color: active ? color : 'var(--ink-faint)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all .12s',
                      }}
                    >
                      {opt.id === 'todo' && <Clock size={16} strokeWidth={2} />}
                      {opt.id === 'doing' && <Play size={16} strokeWidth={2} />}
                      {opt.id === 'done' && <Icon name="check-circle" size={16} />}
                      {opt.id === 'cancelled' && <Icon name="x-circle" size={16} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Prioridade */}
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>
                {L("PRIORIDADE", "PRIORITY")}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRIORITY_OPTIONS.map(opt => {
                  const active = priority === opt.v
                  const color = PRIORITY_MOBILE_COLOR[opt.v]
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      title={opt.label}
                      aria-label={opt.label}
                      onClick={() => { setPriority(opt.v); save({ priority: opt.v }) }}
                      style={{
                        width: 40, height: 36,
                        borderRadius: 8, border: `1px solid ${active ? color : 'var(--edge)'}`,
                        background: active ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
                        color: active ? color : 'var(--ink-faint)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all .12s',
                      }}
                    >
                      <Icon name={opt.icon} size={17} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Status */}
        <div>
          <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>
            {L("ESTADO", "STATUS")}
          </label>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_OPTIONS.map(opt => {
              const active = status === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setStatus(opt.id); save({ status: opt.id }) }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 0', width: 78,
                    borderRadius: 7, border: `1px solid ${active ? opt.color : 'var(--edge)'}`,
                    background: active ? `color-mix(in oklab, ${opt.color} 14%, transparent)` : 'transparent',
                    color: active ? opt.color : 'var(--ink-faint)',
                    cursor: 'pointer', transition: 'all .12s',
                  }}
                >
                  {L(opt.labelPt, opt.labelEn)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>
            {L("PRIORIDADE", "PRIORITY")}
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITY_OPTIONS.map(opt => {
              const active = priority === opt.v
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => { setPriority(opt.v); save({ priority: opt.v }) }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 99,
                    border: `1px solid ${active ? opt.color : 'var(--edge)'}`,
                    background: active ? `color-mix(in oklab, ${opt.color} 15%, transparent)` : 'transparent',
                    color: active ? opt.color : 'var(--ink-faint)',
                    cursor: 'pointer', transition: 'all .12s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
        </>
        )}

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Due date */}
          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("DATA LIMITE", "DUE DATE")}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              onBlur={() => { if ((dueDate || null) !== live.due_date) save({ due_date: dueDate || null }) }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Due time */}
          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("HORA (OPCIONAL)", "TIME (OPTIONAL)")}
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
              onBlur={() => { if ((dueTime || null) !== live.due_time) save({ due_time: dueTime || null }) }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* System */}
          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("SISTEMA", "SYSTEM")}
            </label>
            <select
              value={system}
              onChange={e => { setSystem(e.target.value); save({ system: e.target.value || null }) }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="">—</option>
              {ALL_SYSTEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Project */}
          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("PROJETO", "PROJECT")}
            </label>
            <select
              value={projectId}
              onChange={e => { setProjectId(e.target.value); save({ project_id: e.target.value || null }) }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="">{L("(nenhum)", "(none)")}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Fav */}
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            <FavStar on={isFavourite} onClick={() => { setIsFavourite(f => !f); save({ is_favourite: !isFavourite }) }} size={20} />
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-faint)' }}>
              {isFavourite ? L("Favorito", "Favourite") : L("Adicionar aos favoritos", "Add to favourites")}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>
            {L("ETIQUETAS", "TAGS")}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {tags.map(tag => <Chip key={tag} label={tag} onRemove={() => removeTag(tag)} color="var(--c-task)" />)}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              placeholder={L("Adicionar etiqueta…", "Add tag…")}
              style={{ fontSize: 12, border: 'none', borderBottom: '1px solid var(--edge-soft)', background: 'transparent', color: 'var(--ink-dim)', outline: 'none', width: 120, padding: '2px 0', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--edge-soft)' }}>
          <button type="button" className="btn" onClick={handleDelete} style={{ color: 'var(--neg)', borderColor: 'transparent', background: 'transparent', gap: 6, fontSize: 12 }}>
            <Icon name="trash" size={13} />
            {L("Eliminar", "Delete")}
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-faint)' }}>
            {L("Criado", "Created")} {relativeTime(live.created_at)} · {L("Atualizado", "Updated")} {relativeTime(live.updated_at)}
          </span>
        </div>
        </div>
      </div>
    </Modal>
  )
}

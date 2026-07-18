'use client'
import { useState } from 'react'
import { Modal, Icon, FavStar } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { TaskStore } from '@/lib/task-store'
import type { TaskStatus, TaskPriority } from '@/lib/tasks'
import { SYSTEMS, COMPANIES } from '@/lib/constants'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

type Props = {
  open: boolean
  onClose: () => void
  initialStatus?: TaskStatus
}

const ALL_SYSTEMS = [
  ...SYSTEMS.map(s => ({ id: s.id, label: s.label })),
  ...COMPANIES.map(c => ({ id: c.id, label: c.label })),
]

const PRIORITY_OPTS = [
  { v: 1 as TaskPriority, label: '▲ P1', border: '#EF4444', activeBg: '#EF444420', color: '#EF4444' },
  { v: 2 as TaskPriority, label: '● P2', border: '#F59E0B', activeBg: '#F59E0B20', color: '#F59E0B' },
  { v: 3 as TaskPriority, label: '▽ P3', border: '#8B5CF6', activeBg: '#8B5CF620', color: '#8B5CF6' },
]

export default function AddTaskModal({ open, onClose, initialStatus = 'todo' }: Props) {
  useLang()
  const isMobile = useIsMobile()
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState<string>('')
  const [priority, setPriority] = useState<TaskPriority>(3)
  const [system, setSystem] = useState('')
  const [isFavourite, setIsFavourite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleFocused, setTitleFocused] = useState(false)

  async function doSave() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await TaskStore.addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        due_time: dueTime || null,
        priority,
        system: system || undefined,
        is_favourite: isFavourite,
        status: initialStatus,
      })
      setTitle(''); setDescription(''); setDueDate(''); setDueTime(''); setPriority(3); setSystem(''); setIsFavourite(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Erro ao criar tarefa', 'Failed to create task'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await doSave()
  }

  const pOptions: { v: TaskPriority; color: string; label: string }[] = [
    { v: 1, color: 'var(--p1)', label: 'P1' },
    { v: 2, color: 'var(--p2)', label: 'P2' },
    { v: 3, color: 'var(--p3)', label: 'P3' },
  ]

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: '#0F1117',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            height: 'calc(52px + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 16,
            paddingRight: 16,
            background: '#0F1117',
            borderBottom: '1px solid #2A2D3A',
          }}
        >
          {/* X close */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8B909E',
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={20} />
          </button>
          {/* Title */}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 600,
              color: '#F0F1F4',
            }}
          >
            {L("Nova Tarefa", "New Task")}
          </div>
          {/* Save button */}
          <button
            type="button"
            onClick={doSave}
            disabled={!title.trim() || saving}
            style={{
              background: 'none',
              border: 'none',
              cursor: !title.trim() || saving ? 'not-allowed' : 'pointer',
              color: !title.trim() || saving ? '#555968' : '#8B5CF6',
              fontSize: 15,
              fontWeight: 600,
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            {saving ? L("A criar…", "Saving…") : L("Guardar", "Save")}
          </button>
        </div>

        {/* Scrollable content */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}
        >
          {/* Task name */}
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder={L("O que precisas fazer?", "What do you need to do?")}
            style={{
              width: '100%',
              fontSize: 20,
              fontWeight: 500,
              border: 'none',
              borderBottom: titleFocused ? '1px solid #8B5CF6' : '1px solid #2A2D3A',
              background: 'transparent',
              color: '#F0F1F4',
              padding: '12px 0',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />

          {/* Due date row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 0',
              borderBottom: '1px solid #2A2D3A',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#8B909E', display: 'flex' }}><Icon name="calendar" size={16} /></span>
              <span style={{ fontSize: 14, color: '#8B909E' }}>{L("Data limite", "Due date")}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  background: '#252830',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#F0F1F4',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                }}
              />
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                aria-label={L("Hora (opcional)", "Time (optional)")}
                style={{
                  background: '#252830',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#F0F1F4',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          {/* Priority row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 0',
              borderBottom: '1px solid #2A2D3A',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#8B909E', display: 'flex' }}><Icon name="flag" size={16} /></span>
              <span style={{ fontSize: 14, color: '#8B909E' }}>{L("Prioridade", "Priority")}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITY_OPTS.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setPriority(opt.v)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 16,
                    border: `1.5px solid ${opt.border}`,
                    background: priority === opt.v ? opt.activeBg : 'transparent',
                    color: opt.color,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all .12s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* More options row */}
          <button
            type="button"
            onClick={() => setShowMoreOptions(m => !m)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '16px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8B909E',
              fontSize: 13,
              borderBottom: '1px solid #2A2D3A',
            }}
          >
            <span style={{ color: '#8B909E', display: 'flex' }}><Icon name={showMoreOptions ? 'chevron-up' : 'chevron-down'} size={14} /></span>
            {showMoreOptions ? L('Menos opções', 'Fewer options') : L('Mais opções', 'More options')}
          </button>

          {showMoreOptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* System */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid #2A2D3A',
                }}
              >
                <span style={{ fontSize: 14, color: '#8B909E' }}>{L("Sistema", "System")}</span>
                <select
                  value={system}
                  onChange={e => setSystem(e.target.value)}
                  style={{
                    background: '#252830',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px',
                    color: '#F0F1F4',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                    colorScheme: 'dark',
                  }}
                >
                  <option value="">—</option>
                  {ALL_SYSTEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {/* Description */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid #2A2D3A' }}>
                <span style={{ fontSize: 14, color: '#8B909E', display: 'block', marginBottom: 10 }}>{L("Descrição", "Description")}</span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={L("Descrição (opcional)…", "Description (optional)…")}
                  rows={3}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    border: 'none',
                    borderRadius: 10,
                    background: '#252830',
                    color: '#F0F1F4',
                    padding: '12px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box' as 'border-box',
                  }}
                />
              </div>

              {/* Fav */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '16px 0',
                }}
              >
                <FavStar on={isFavourite} onClick={() => setIsFavourite(f => !f)} size={20} />
                <span style={{ fontSize: 13, color: '#8B909E' }}>
                  {isFavourite ? L("Favorito", "Favourite") : L("Adicionar aos favoritos", "Add to favourites")}
                </span>
              </div>
            </div>
          )}

          {error && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 12 }}>{error}</div>}
        </form>
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          {L("Nova Tarefa", "New Task")}
        </div>

        {/* Title */}
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={L("Nome da tarefa…", "Task title…")}
          style={{ width: '100%', fontSize: 15, fontWeight: 500, border: 'none', borderBottom: '1px solid var(--edge)', background: 'transparent', color: 'var(--ink)', padding: '6px 0', outline: 'none', fontFamily: 'inherit' }}
        />

        {/* Due date */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("DATA LIMITE", "DUE DATE")}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("HORA (OPCIONAL)", "TIME (OPTIONAL)")}
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={L("Descrição (opcional)…", "Description (optional)…")}
          rows={2}
          style={{ width: '100%', fontSize: 13, border: 'none', borderBottom: '1px solid var(--edge-soft)', background: 'transparent', color: 'var(--ink-dim)', padding: '4px 0', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
        />

        {/* System */}
        <div>
          <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
            {L("SISTEMA", "SYSTEM")}
          </label>
          <select
            value={system}
            onChange={e => setSystem(e.target.value)}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: system ? 'var(--ink)' : 'var(--ink-faint)', outline: 'none', fontFamily: 'inherit' }}
          >
            <option value="">—</option>
            {ALL_SYSTEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>
            {L("PRIORIDADE", "PRIORITY")}
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {pOptions.map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setPriority(opt.v)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
                  border: `1px solid ${priority === opt.v ? opt.color : 'var(--edge)'}`,
                  background: priority === opt.v ? `color-mix(in oklab, ${opt.color} 15%, transparent)` : 'transparent',
                  color: priority === opt.v ? opt.color : 'var(--ink-faint)',
                  cursor: 'pointer', transition: 'all .12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        {error && (
          <div style={{ color: 'var(--neg)', fontSize: 12 }}>{error}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--edge-soft)' }}>
          <FavStar on={isFavourite} onClick={() => setIsFavourite(f => !f)} size={18} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={onClose} style={{ fontSize: 13 }}>
              {L("Cancelar", "Cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={!title.trim() || saving}
              style={{ '--accent': 'var(--c-task)' } as React.CSSProperties}
            >
              <Icon name="check" size={14} />
              {L("Criar Tarefa", "Create Task")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

'use client'
import { useState } from 'react'
import { Modal, Icon, FavStar } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { TaskStore } from '@/lib/task-store'
import type { TaskStatus, TaskPriority } from '@/lib/tasks'
import { SYSTEMS, COMPANIES } from '@/lib/constants'

type Props = {
  open: boolean
  onClose: () => void
  initialStatus?: TaskStatus
}

const ALL_SYSTEMS = [
  ...SYSTEMS.map(s => ({ id: s.id, label: s.label })),
  ...COMPANIES.map(c => ({ id: c.id, label: c.label })),
]

export default function AddTaskModal({ open, onClose, initialStatus = 'todo' }: Props) {
  useLang()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(3)
  const [system, setSystem] = useState('')
  const [fav, setFav] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await TaskStore.addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        due: due || undefined,
        priority,
        system: system || undefined,
        fav,
        status: initialStatus,
      })
      setTitle(''); setDescription(''); setDue(''); setPriority(3); setSystem(''); setFav(false)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const pOptions: { v: TaskPriority; color: string; label: string }[] = [
    { v: 1, color: 'var(--p1)', label: 'P1' },
    { v: 2, color: 'var(--p2)', label: 'P2' },
    { v: 3, color: 'var(--p3)', label: 'P3' },
  ]

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

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={L("Descrição (opcional)…", "Description (optional)…")}
          rows={2}
          style={{ width: '100%', fontSize: 13, border: 'none', borderBottom: '1px solid var(--edge-soft)', background: 'transparent', color: 'var(--ink-dim)', padding: '4px 0', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
        />

        {/* Due + System row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>
              {L("DATA LIMITE", "DUE DATE")}
            </label>
            <input
              type="date"
              value={due}
              onChange={e => setDue(e.target.value)}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--edge)', background: 'var(--bg-raised-2)', color: 'var(--ink)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--edge-soft)' }}>
          <FavStar on={fav} onClick={() => setFav(f => !f)} size={18} />
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

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
  { v: 1 as TaskPriority, label: 'P1', border: '#E05C3A', activeBg: '#E05C3A20', color: '#E05C3A' },
  { v: 2 as TaskPriority, label: 'P2', border: '#D4A843', activeBg: '#D4A84320', color: '#D4A843' },
  { v: 3 as TaskPriority, label: 'P3', border: '#8B5CF6', activeBg: '#8B5CF620', color: '#8B5CF6' },
]

export default function AddTaskModal({ open, onClose, initialStatus = 'todo' }: Props) {
  useLang()
  const isMobile = useIsMobile()
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(3)
  const [system, setSystem] = useState('')
  const [fav, setFav] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Erro ao criar tarefa', 'Failed to create task'))
    } finally {
      setSaving(false)
    }
  }

  const pOptions: { v: TaskPriority; color: string; label: string }[] = [
    { v: 1, color: 'var(--p1)', label: 'P1' },
    { v: 2, color: 'var(--p2)', label: 'P2' },
    { v: 3, color: 'var(--p3)', label: 'P3' },
  ]

  if (isMobile) {
    return (
      <Modal open={open} onClose={onClose} fullScreenMobile title={L("Nova Tarefa", "New Task")}>
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {/* Scrollable content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)',
          }}>
            {/* Task name */}
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={L("Nome da tarefa...", "Task name...")}
              style={{
                width: '100%',
                fontSize: 18,
                fontWeight: 500,
                border: 'none',
                borderBottom: '1px solid #2a2520',
                background: 'transparent',
                color: '#E8E0D5',
                padding: '16px 0',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />

            {/* Due date */}
            <div style={{ marginTop: 24 }}>
              <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: '#94A3B8', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                {L("DATA LIMITE", "DUE DATE")}
              </label>
              <input
                type="date"
                value={due}
                onChange={e => setDue(e.target.value)}
                style={{ width: '100%', fontSize: 16, padding: '12px', borderRadius: 8, border: '1px solid #2a2520', background: '#1e1b18', color: '#E8E0D5', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {/* Priority */}
            <div style={{ marginTop: 24 }}>
              <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: '#94A3B8', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                {L("PRIORIDADE", "PRIORITY")}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRIORITY_OPTS.map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setPriority(opt.v)}
                    style={{
                      height: 52,
                      width: '100%',
                      borderRadius: 10,
                      border: `1px solid ${opt.border}`,
                      background: priority === opt.v ? opt.activeBg : 'transparent',
                      color: opt.color,
                      fontSize: 15,
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

            {/* Mais opções */}
            <button
              type="button"
              onClick={() => setShowMoreOptions(m => !m)}
              style={{ marginTop: 24, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94A3B8', textAlign: 'left', padding: 0, display: 'block' }}
            >
              {showMoreOptions ? L('▲ Menos opções', '▲ Fewer options') : L('▼ Mais opções', '▼ More options')}
            </button>

            {showMoreOptions && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* System */}
                <div>
                  <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: '#94A3B8', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                    {L("SISTEMA", "SYSTEM")}
                  </label>
                  <select
                    value={system}
                    onChange={e => setSystem(e.target.value)}
                    style={{ width: '100%', fontSize: 16, padding: '12px', borderRadius: 8, border: '1px solid #2a2520', background: '#1e1b18', color: system ? '#E8E0D5' : '#94A3B8', outline: 'none', fontFamily: 'inherit' }}
                  >
                    <option value="">—</option>
                    {ALL_SYSTEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: '#94A3B8', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                    {L("DESCRIÇÃO", "DESCRIPTION")}
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={L("Descrição (opcional)…", "Description (optional)…")}
                    rows={3}
                    style={{ width: '100%', fontSize: 14, border: '1px solid #2a2520', borderRadius: 8, background: '#1e1b18', color: '#E8E0D5', padding: '12px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Fav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FavStar on={fav} onClick={() => setFav(f => !f)} size={20} />
                  <span style={{ fontSize: 13, color: '#94A3B8' }}>
                    {fav ? L("Favorito", "Favourite") : L("Adicionar aos favoritos", "Add to favourites")}
                  </span>
                </div>
              </div>
            )}

            {error && <div style={{ color: '#E05C3A', fontSize: 12, marginTop: 12 }}>{error}</div>}
          </div>

          {/* Fixed save button */}
          <button
            type="submit"
            disabled={!title.trim() || saving}
            style={{
              position: 'fixed',
              bottom: 'env(safe-area-inset-bottom)',
              left: 0,
              right: 0,
              height: 56,
              background: !title.trim() || saving ? '#4a3d6e' : '#8B5CF6',
              color: '#fff',
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: !title.trim() || saving ? 'not-allowed' : 'pointer',
              transition: 'background .15s',
            }}
          >
            {saving ? L("A criar…", "Creating…") : L("Criar Tarefa", "Create Task")}
          </button>
        </form>
      </Modal>
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

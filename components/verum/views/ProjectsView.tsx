'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Icon, EmptyState } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { fmt } from '@/lib/fmt'
import { formatDate } from '@/lib/date'
import {
  type VerumProject, type VerumMilestone, type VerumFinancial,
  PROJECT_STATUS_META, PROJECT_TYPE_META,
} from '@/lib/verum'

type ProjectWithCounts = VerumProject & { milestones?: { id: string; completed: boolean }[] }

const STATUS_FILTERS = [
  { value: 'all',       label_pt: 'Todos',    label_en: 'All' },
  { value: 'lead',      label_pt: 'Lead',     label_en: 'Lead' },
  { value: 'active',    label_pt: 'Ativo',    label_en: 'Active' },
  { value: 'on_hold',   label_pt: 'Em Espera', label_en: 'On Hold' },
  { value: 'completed', label_pt: 'Concluído', label_en: 'Completed' },
  { value: 'cancelled', label_pt: 'Cancelado', label_en: 'Cancelled' },
]

function BudgetBar({ budget, spent }: { budget: number | null; spent: number | null }) {
  if (!budget || budget === 0) return null
  const s = spent ?? 0
  const pct = Math.min((s / budget) * 100, 100)
  const over = s > budget
  const color = pct < 60 ? 'var(--pos)' : pct < 80 ? 'var(--c-fin)' : 'var(--neg)'
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-faint)', marginBottom: 3 }}>
        <span>{fmt.eurk(s)} / {fmt.eurk(budget)}</span>
        {over && <span style={{ color: 'var(--neg)', fontWeight: 600 }}>{L('Excedido', 'Over budget')}</span>}
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'var(--edge-soft)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

function ProjectCard({
  project, onDetail, onEdit, onDelete,
}: {
  project: ProjectWithCounts
  onDetail: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  useLang()
  const ms = project.milestones ?? []
  const total = ms.length
  const done = ms.filter(m => m.completed).length
  const statusMeta = PROJECT_STATUS_META[project.status]
  const typeMeta = PROJECT_TYPE_META[project.type]

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--edge)',
      borderRadius: 'var(--radius)', padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
            {project.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
              background: `color-mix(in oklch, ${statusMeta.color} 14%, transparent)`,
              color: statusMeta.color,
            }}>
              {L(statusMeta.label_pt, statusMeta.label_en)}
            </span>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 99,
              background: 'var(--bg-inset)', color: 'var(--ink-dim)', fontWeight: 500,
            }}>
              {L(typeMeta.label_pt, typeMeta.label_en)}
            </span>
          </div>
          {project.client && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-dim)', marginBottom: 2 }}>
              <Icon name="users" size={11} />
              {project.client}
            </div>
          )}
          {project.address && (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.address}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}>
            <Icon name="edit" size={12} />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 4 }}>
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>

      <BudgetBar budget={project.budget} spent={project.spent} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {project.start_date && formatDate(project.start_date)}
          {project.start_date && project.end_date && ' → '}
          {project.end_date && formatDate(project.end_date)}
        </div>
        {total > 0 && (
          <span style={{ fontSize: 11, color: done === total ? 'var(--pos)' : 'var(--ink-dim)' }}>
            {done}/{total} {L('marcos', 'milestones')}
          </span>
        )}
      </div>

      <button
        className="btn"
        style={{ marginTop: 12, width: '100%', fontSize: 12 }}
        onClick={onDetail}
      >
        {L('Ver Detalhes', 'View Details')}
      </button>
    </div>
  )
}

// ─── Sortable milestone row ──────────────────────────────────────────────────

function SortableMilestoneRow({
  milestone, onToggle, onDelete,
}: {
  milestone: VerumMilestone
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: milestone.id })
  const isOverdue = !!(milestone.due_date && !milestone.completed && new Date(milestone.due_date) < new Date())
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderBottom: '1px solid var(--edge-soft)', background: 'var(--bg-raised)',
      }}
    >
      <span {...attributes} {...listeners} style={{ color: 'var(--ink-faint)', cursor: 'grab', flexShrink: 0 }}>
        <Icon name="drag" size={12} />
      </span>
      <input
        type="checkbox"
        checked={milestone.completed}
        onChange={e => onToggle(milestone.id, e.target.checked)}
        style={{ flexShrink: 0, accentColor: 'var(--c-verum)' }}
      />
      <span style={{
        flex: 1, fontSize: 13, minWidth: 0,
        color: milestone.completed ? 'var(--ink-faint)' : 'var(--ink)',
        textDecoration: milestone.completed ? 'line-through' : 'none',
      }}>
        {milestone.title}
      </span>
      {milestone.due_date && (
        <span style={{ fontSize: 11, color: isOverdue ? 'var(--neg)' : 'var(--ink-faint)', flexShrink: 0 }}>
          {formatDate(milestone.due_date)}
        </span>
      )}
      <button onClick={() => onDelete(milestone.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 3, flexShrink: 0 }}>
        <Icon name="trash" size={11} />
      </button>
    </div>
  )
}

// ─── ProjectDetailModal ──────────────────────────────────────────────────────

function ProjectDetailModal({
  project, onClose, onEdit, onRefresh,
}: {
  project: ProjectWithCounts
  onClose: () => void
  onEdit: () => void
  onRefresh: () => void
}) {
  useLang()
  const [milestones, setMilestones] = useState<VerumMilestone[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [notes, setNotes] = useState(project.notes ?? '')
  const [financials, setFinancials] = useState<VerumFinancial[]>([])
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const fetchMilestones = useCallback(async () => {
    const res = await fetch(`/api/verum/projects/${project.id}/milestones`)
    if (res.ok) setMilestones((await res.json()).milestones ?? [])
  }, [project.id])

  const fetchFinancials = useCallback(async () => {
    const res = await fetch('/api/verum/financials')
    if (res.ok) {
      const d = await res.json()
      setFinancials((d.entries ?? []).filter((f: VerumFinancial) => f.project_id === project.id))
    }
  }, [project.id])

  useEffect(() => {
    fetchMilestones()
    fetchFinancials()
    setNotes(project.notes ?? '')
  }, [project.id, fetchMilestones, fetchFinancials, project.notes])

  function handleNotesChange(val: string) {
    setNotes(val)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      fetch(`/api/verum/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: val }),
      })
    }, 800)
  }

  async function addMilestone() {
    if (!newTitle.trim()) return
    await fetch(`/api/verum/projects/${project.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, due_date: newDue || null, order_index: milestones.length }),
    })
    setNewTitle(''); setNewDue('')
    fetchMilestones(); onRefresh()
  }

  async function toggleMilestone(id: string, completed: boolean) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed } : m))
    await fetch(`/api/verum/projects/${project.id}/milestones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })
    onRefresh()
  }

  async function deleteMilestone(id: string) {
    setMilestones(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/verum/projects/${project.id}/milestones/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = milestones.findIndex(m => m.id === active.id)
    const newIdx = milestones.findIndex(m => m.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(milestones, oldIdx, newIdx)
    setMilestones(reordered)
    await fetch(`/api/verum/projects/${project.id}/milestones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: reordered.map((m, i) => ({ id: m.id, order_index: i })) }),
    })
  }

  const statusMeta = PROJECT_STATUS_META[project.status]
  const typeMeta = PROJECT_TYPE_META[project.type]
  const finRevenue = financials.filter(f => f.type === 'revenue' || f.type === 'invoice').reduce((s, f) => s + f.amount, 0)
  const finExpenses = financials.filter(f => f.type === 'expense' || f.type === 'payroll').reduce((s, f) => s + f.amount, 0)

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8,
    padding: '8px 11px', color: 'var(--ink)', fontSize: 13, width: '100%',
  }

  return (
    <Modal open onClose={onClose} width={680}>
      <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {project.name}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                background: `color-mix(in oklch, ${statusMeta.color} 14%, transparent)`,
                color: statusMeta.color,
              }}>
                {L(statusMeta.label_pt, statusMeta.label_en)}
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-inset)', color: 'var(--ink-dim)' }}>
                {L(typeMeta.label_pt, typeMeta.label_en)}
              </span>
            </div>
          </div>
          <button className="btn" style={{ flexShrink: 0, fontSize: 12 }} onClick={onEdit}>
            <Icon name="edit" size={12} />
            {L('Editar', 'Edit')}
          </button>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {project.client && (
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 2 }}>CLIENT</div>
              <div style={{ fontSize: 13 }}>{project.client}</div>
            </div>
          )}
          {project.budget && (
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 2 }}>BUDGET</div>
              <div style={{ fontSize: 13 }}>{fmt.eur(project.budget)}</div>
            </div>
          )}
          {(project.start_date || project.end_date) && (
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 2 }}>TIMELINE</div>
              <div style={{ fontSize: 13 }}>
                {project.start_date ? formatDate(project.start_date) : '—'}
                {' → '}
                {project.end_date ? formatDate(project.end_date) : '—'}
              </div>
            </div>
          )}
          {project.address && (
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 2 }}>ADDRESS</div>
              <div style={{ fontSize: 13 }}>{project.address}</div>
            </div>
          )}
        </div>

        <BudgetBar budget={project.budget} spent={project.spent} />

        {/* Milestones */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 10 }}>
            {L('Marcos', 'Milestones')}
            {milestones.length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginLeft: 8 }}>
                {milestones.filter(m => m.completed).length}/{milestones.length}
              </span>
            )}
          </div>
          {milestones.length > 0 && (
            <div style={{ border: '1px solid var(--edge)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 10 }}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  {milestones.map(m => (
                    <SortableMilestoneRow key={m.id} milestone={m} onToggle={toggleMilestone} onDelete={deleteMilestone} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder={L('Novo marco…', 'New milestone…')}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMilestone()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="date"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              style={{ ...inputStyle, width: 130 }}
            />
            <button className="btn" style={{ flexShrink: 0 }} onClick={addMilestone} disabled={!newTitle.trim()}>
              <Icon name="plus" size={12} />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 5 }}>
            {L('NOTAS', 'NOTES')} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>· {L('auto-guarda', 'auto-saves')}</span>
          </div>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Linked financials */}
        {financials.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8 }}>
              {L('Financeiro Ligado', 'Linked Financials')}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--pos)' }}>+{fmt.eur(finRevenue)}</span>
              <span style={{ fontSize: 12, color: 'var(--neg)' }}>−{fmt.eur(finExpenses)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: finRevenue - finExpenses >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                = {fmt.eur(finRevenue - finExpenses)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {financials.slice(0, 10).map(f => {
                const isIncome = f.type === 'revenue' || f.type === 'invoice'
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ fontSize: 10, color: isIncome ? 'var(--pos)' : 'var(--neg)', fontWeight: 600, flexShrink: 0 }}>
                      {f.type}
                    </span>
                    <span style={{ flex: 1, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.description}
                    </span>
                    <span style={{ fontWeight: 600, color: isIncome ? 'var(--pos)' : 'var(--neg)', flexShrink: 0 }}>
                      {fmt.eur(f.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── ProjectFormModal ────────────────────────────────────────────────────────

function ProjectFormModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: ProjectWithCounts | null
}) {
  useLang()
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [type, setType] = useState<VerumProject['type']>('construction')
  const [status, setStatus] = useState<VerumProject['status']>('active')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setName(editing.name); setClient(editing.client ?? ''); setType(editing.type)
      setStatus(editing.status); setBudget(editing.budget ? String(editing.budget) : '')
      setStartDate(editing.start_date ?? ''); setEndDate(editing.end_date ?? '')
      setAddress(editing.address ?? ''); setDescription(editing.description ?? '')
      setPriority(editing.priority); setNotes(editing.notes ?? '')
    } else {
      setName(''); setClient(''); setType('construction'); setStatus('active')
      setBudget(''); setStartDate(''); setEndDate(''); setAddress('')
      setDescription(''); setPriority(3); setNotes('')
    }
    setError('')
  }, [editing, open])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      const method = editing ? 'PATCH' : 'POST'
      const url = editing ? `/api/verum/projects/${editing.id}` : '/api/verum/projects'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, client: client || null, type, status,
          budget: budget ? Number(budget) : null,
          start_date: startDate || null, end_date: endDate || null,
          address: address || null, description: description || null,
          priority, notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error()
      onSaved(); onClose()
    } catch {
      setError(L('Erro ao guardar', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
    borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
    color: 'var(--ink-faint)', marginBottom: 5, display: 'block',
  }
  const TYPES = Object.entries(PROJECT_TYPE_META).map(([v, m]) => ({ value: v, ...m }))
  const STATUSES = Object.entries(PROJECT_STATUS_META).map(([v, m]) => ({ value: v, ...m }))

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {editing ? L('Editar Projeto', 'Edit Project') : L('Novo Projeto', 'New Project')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>NOME *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>CLIENT</label>
            <input type="text" value={client} onChange={e => setClient(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('TIPO', 'TYPE')}</label>
              <select value={type} onChange={e => setType(e.target.value as VerumProject['type'])} style={inputStyle}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{L(t.label_pt, t.label_en)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{L('ESTADO', 'STATUS')}</label>
              <select value={status} onChange={e => setStatus(e.target.value as VerumProject['status'])} style={inputStyle}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{L(s.label_pt, s.label_en)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('ORÇAMENTO (€)', 'BUDGET (€)')}</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} style={inputStyle} min={0} />
            </div>
            <div>
              <label style={labelStyle}>{L('PRIORIDADE', 'PRIORITY')}</label>
              <select value={priority} onChange={e => setPriority(Number(e.target.value))} style={{ ...inputStyle, width: 80 }}>
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('INÍCIO', 'START DATE')}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{L('FIM', 'END DATE')}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{L('MORADA', 'ADDRESS')}</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{L('DESCRIÇÃO', 'DESCRIPTION')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>{L('NOTAS', 'NOTES')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--neg)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>{L('Cancelar', 'Cancel')}</button>
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-verum)' } as React.CSSProperties}
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? L('A guardar…', 'Saving…') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── ProjectsView ────────────────────────────────────────────────────────────

export default function ProjectsView() {
  useLang()
  const isMobile = useIsMobile()
  const [projects, setProjects] = useState<ProjectWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithCounts | null>(null)
  const [detailProject, setDetailProject] = useState<ProjectWithCounts | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      const url = statusFilter === 'all' ? '/api/verum/projects' : `/api/verum/projects?status=${statusFilter}`
      const res = await fetch(url)
      if (res.ok) setProjects((await res.json()).projects ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  async function handleDelete(id: string) {
    if (!confirm(L('Apagar projeto? Esta ação não pode ser desfeita.', 'Delete project? This cannot be undone.'))) return
    setProjects(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/verum/projects/${id}`, { method: 'DELETE' })
  }

  function openEdit(project: ProjectWithCounts) {
    setEditingProject(project)
    setShowFormModal(true)
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            {L('Projetos', 'Projects')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 3 }}>
            {projects.length} {L('projeto(s)', 'project(s)')}
          </div>
        </div>
        <button
          className="btn btn-accent"
          style={{ '--accent': 'var(--c-verum)' } as React.CSSProperties}
          onClick={() => { setEditingProject(null); setShowFormModal(true) }}
        >
          <Icon name="plus" size={13} />
          {L('Novo Projeto', 'New Project')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => {
          const isActive = statusFilter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${isActive ? 'var(--c-verum)' : 'var(--edge)'}`,
                background: isActive ? 'color-mix(in oklch, var(--c-verum) 14%, transparent)' : 'transparent',
                color: isActive ? 'var(--c-verum)' : 'var(--ink-dim)',
              }}
            >
              {L(f.label_pt, f.label_en)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="building"
          title={L('Sem projetos', 'No projects')}
          subtitle={L('Cria o teu primeiro projeto.', 'Create your first project.')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onDetail={() => setDetailProject(p)}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingProject(null) }}
        onSaved={fetchProjects}
        editing={editingProject}
      />

      {detailProject && (
        <ProjectDetailModal
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onEdit={() => openEdit(detailProject)}
          onRefresh={fetchProjects}
        />
      )}
    </div>
  )
}

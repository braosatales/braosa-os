'use client'
import { useState, useEffect, useCallback } from 'react'
import { Modal, Icon, EmptyState } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { fmt } from '@/lib/fmt'
import { formatDate } from '@/lib/date'
import type { VerumTeamMember } from '@/lib/verum'

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--c-verum)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: Math.round(size * 0.33), fontWeight: 700,
      color: 'oklch(0.18 0.01 80)', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function MemberCard({
  member, onEdit, onArchive,
}: {
  member: VerumTeamMember
  onEdit: () => void
  onArchive: () => void
}) {
  useLang()
  const [showSalary, setShowSalary] = useState(false)

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--edge)',
      borderRadius: 'var(--radius)', padding: '16px',
    }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <Avatar name={member.name} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {member.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>{member.role}</div>
          {member.department && (
            <span style={{
              display: 'inline-block', marginTop: 5, fontSize: 10, padding: '2px 7px', borderRadius: 99,
              background: 'color-mix(in oklch, var(--c-verum) 14%, transparent)',
              color: 'var(--c-verum)', fontWeight: 600,
            }}>
              {member.department}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}>
            <Icon name="edit" size={12} />
          </button>
          {member.active && (
            <button onClick={onArchive} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 4 }}>
              <Icon name="trash" size={12} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {member.email && (
          <a href={`mailto:${member.email}`} style={{ fontSize: 12, color: 'var(--c-verum)', textDecoration: 'none' }}>
            {member.email}
          </a>
        )}
        {member.phone && (
          <a href={`tel:${member.phone}`} style={{ fontSize: 12, color: 'var(--ink-dim)', textDecoration: 'none' }}>
            {member.phone}
          </a>
        )}
        {member.salary_monthly && (
          <button
            onClick={() => setShowSalary(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontSize: 12, color: 'var(--ink-faint)' }}
          >
            {showSalary ? `${fmt.eur(member.salary_monthly)}/mês` : '••• /mês'}
          </button>
        )}
        {member.start_date && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            {L('Desde', 'Since')} {formatDate(member.start_date)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TeamMemberFormModal ─────────────────────────────────────────────────────

function TeamMemberFormModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: VerumTeamMember | null
}) {
  useLang()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [salary, setSalary] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setName(editing.name); setRole(editing.role); setDepartment(editing.department ?? '')
      setEmail(editing.email ?? ''); setPhone(editing.phone ?? '')
      setSalary(editing.salary_monthly ? String(editing.salary_monthly) : '')
      setStartDate(editing.start_date ?? ''); setNotes(editing.notes ?? '')
    } else {
      setName(''); setRole(''); setDepartment(''); setEmail('')
      setPhone(''); setSalary(''); setStartDate(''); setNotes('')
    }
    setError('')
  }, [editing, open])

  async function handleSave() {
    if (!name.trim() || !role.trim()) return
    setSaving(true); setError('')
    try {
      const method = editing ? 'PATCH' : 'POST'
      const url = editing ? `/api/verum/team/${editing.id}` : '/api/verum/team'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, role, department: department || null,
          email: email || null, phone: phone || null,
          salary_monthly: salary ? Number(salary) : null,
          start_date: startDate || null, notes: notes || null,
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

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {editing ? L('Editar Membro', 'Edit Member') : L('Novo Membro', 'New Member')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>NOME *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>{L('CARGO', 'ROLE')} *</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{L('DEPARTAMENTO', 'DEPARTMENT')}</label>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{L('TELEFONE', 'PHONE')}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('SALÁRIO MENSAL (€)', 'MONTHLY SALARY (€)')}</label>
              <input type="number" value={salary} onChange={e => setSalary(e.target.value)} style={inputStyle} min={0} />
            </div>
            <div>
              <label style={labelStyle}>{L('DATA DE INÍCIO', 'START DATE')}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
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
            disabled={saving || !name.trim() || !role.trim()}
          >
            {saving ? L('A guardar…', 'Saving…') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── TeamView ────────────────────────────────────────────────────────────────

export default function TeamView() {
  useLang()
  const isMobile = useIsMobile()
  const [members, setMembers] = useState<VerumTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [deptFilter, setDeptFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<VerumTeamMember | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/verum/team')
      if (res.ok) setMembers((await res.json()).members ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function handleArchive(id: string) {
    if (!confirm(L('Arquivar membro? (pode ser reativado depois)', 'Archive member? (can be reactivated later)'))) return
    await fetch(`/api/verum/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    })
    fetchMembers()
  }

  const activeMembers = members.filter(m => m.active)
  const inactiveMembers = members.filter(m => !m.active)

  const departments = ['all', ...Array.from(new Set(
    members.filter(m => m.department).map(m => m.department!)
  )).sort()]

  const filteredActive = deptFilter === 'all'
    ? activeMembers
    : activeMembers.filter(m => m.department === deptFilter)

  const totalPayroll = activeMembers.reduce((s, m) => s + (m.salary_monthly ?? 0), 0)

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            {L('Equipa', 'Team')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 3 }}>
            {activeMembers.length} {L('membro(s) ativo(s)', 'active member(s)')}
            {totalPayroll > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--ink-faint)' }}>
                · {fmt.eurk(totalPayroll)}/mês
              </span>
            )}
          </div>
        </div>
        <button
          className="btn btn-accent"
          style={{ '--accent': 'var(--c-verum)' } as React.CSSProperties}
          onClick={() => { setEditingMember(null); setShowModal(true) }}
        >
          <Icon name="plus" size={13} />
          {L('Novo Membro', 'New Member')}
        </button>
      </div>

      {departments.length > 2 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {departments.map(d => {
            const isActive = deptFilter === d
            return (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                style={{
                  padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${isActive ? 'var(--c-verum)' : 'var(--edge)'}`,
                  background: isActive ? 'color-mix(in oklch, var(--c-verum) 14%, transparent)' : 'transparent',
                  color: isActive ? 'var(--c-verum)' : 'var(--ink-dim)',
                }}
              >
                {d === 'all' ? L('Todos', 'All') : d}
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
      ) : members.length === 0 ? (
        <EmptyState
          icon="users"
          title={L('Sem membros', 'No members')}
          subtitle={L('Adiciona o primeiro membro da equipa.', 'Add your first team member.')}
        />
      ) : (
        <>
          {filteredActive.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {filteredActive.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  onEdit={() => { setEditingMember(m); setShowModal(true) }}
                  onArchive={() => handleArchive(m.id)}
                />
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
              {L('Nenhum membro neste departamento.', 'No members in this department.')}
            </div>
          )}

          {inactiveMembers.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <button
                onClick={() => setShowInactive(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-faint)', fontSize: 13, padding: '4px 0',
                }}
              >
                <Icon name={showInactive ? 'chevron-down' : 'chevron-right'} size={12} />
                {L('Inativos', 'Inactive')} ({inactiveMembers.length})
              </button>
              {showInactive && (
                <div style={{
                  display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 14, marginTop: 12, opacity: 0.6,
                }}>
                  {inactiveMembers.map(m => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      onEdit={() => { setEditingMember(m); setShowModal(true) }}
                      onArchive={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <TeamMemberFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingMember(null) }}
        onSaved={fetchMembers}
        editing={editingMember}
      />
    </div>
  )
}

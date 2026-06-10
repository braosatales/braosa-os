'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon, Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'

const SYSTEM_LABEL_IDS = ['INBOX', 'SENT', 'DRAFT', 'STARRED', 'IMPORTANT', 'TRASH', 'SPAM',
  'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
  'CATEGORY_PERSONAL', 'UNREAD']

const GMAIL_COLORS = [
  { bg: '#fb4c2f', text: '#ffffff' },
  { bg: '#ffad47', text: '#000000' },
  { bg: '#fad165', text: '#000000' },
  { bg: '#16a766', text: '#ffffff' },
  { bg: '#4a86e8', text: '#ffffff' },
  { bg: '#a479e2', text: '#ffffff' },
  { bg: '#f691b3', text: '#000000' },
  { bg: '#999999', text: '#ffffff' },
]

type GmailLabel = {
  id: string
  name: string
  unreadCount: number
  totalCount: number
  color?: { backgroundColor: string; textColor: string } | null
}

type Props = {
  open: boolean
  onClose: () => void
  onRefresh: () => void
}

export default function LabelsPanel({ open, onClose, onRefresh }: Props) {
  const lang = useLang()
  const [labels, setLabels] = useState<GmailLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<{ bg: string; text: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/mail/labels')
      .then(r => r.json())
      .then(d => setLabels(d.labels ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const systemLabels = labels.filter(l => SYSTEM_LABEL_IDS.includes(l.id))
  const userLabels = labels.filter(l => !SYSTEM_LABEL_IDS.includes(l.id) && l.name)

  async function saveEdit(label: GmailLabel) {
    if (!editValue.trim() || editValue.trim() === label.name) {
      setEditingId(null)
      return
    }
    try {
      await fetch(`/api/mail/labels/${label.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })
      setLabels(prev => prev.map(l => l.id === label.id ? { ...l, name: editValue.trim() } : l))
      onRefresh()
    } catch { setError(L('Erro ao renomear', 'Rename error')) }
    setEditingId(null)
  }

  async function deleteLabel(id: string) {
    try {
      await fetch('/api/mail/labels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelId: id }),
      })
      setLabels(prev => prev.filter(l => l.id !== id))
      setConfirmDelete(null)
      onRefresh()
    } catch { setError(L('Erro ao apagar', 'Delete error')) }
  }

  async function createLabel() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const color = newColor
        ? { backgroundColor: newColor.bg, textColor: newColor.text }
        : undefined
      const res = await fetch('/api/mail/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color }),
      })
      const data = await res.json()
      if (data.label) {
        setLabels(prev => [...prev, {
          id: data.label.id,
          name: data.label.name,
          unreadCount: 0,
          totalCount: 0,
          color: data.label.color ?? null,
        }])
        setNewName('')
        setNewColor(null)
        onRefresh()
      } else {
        setError(data.error ?? L('Erro', 'Error'))
      }
    } catch { setError(L('Erro ao criar', 'Create error')) }
    setCreating(false)
  }

  const systemNames: Record<string, { pt: string; en: string }> = {
    INBOX: { pt: 'Entrada', en: 'Inbox' },
    SENT: { pt: 'Enviados', en: 'Sent' },
    DRAFT: { pt: 'Rascunhos', en: 'Drafts' },
    STARRED: { pt: 'Favoritos', en: 'Starred' },
    IMPORTANT: { pt: 'Importantes', en: 'Important' },
    TRASH: { pt: 'Lixo', en: 'Trash' },
    SPAM: { pt: 'Spam', en: 'Spam' },
  }

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Gerir Etiquetas', 'Manage Labels')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
            {L('A carregar...', 'Loading...')}
          </div>
        ) : (
          <>
            {/* System labels */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', marginBottom: 8 }}>
                {L('ETIQUETAS DO SISTEMA', 'SYSTEM LABELS')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {systemLabels.filter(l => systemNames[l.id]).map(label => (
                  <div key={label.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-inset)', borderRadius: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink-faint)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-dim)' }}>
                      {lang === 'pt' ? systemNames[label.id]?.pt : systemNames[label.id]?.en}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                      {label.totalCount > 0 ? label.totalCount : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* User labels */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', marginBottom: 8 }}>
                {L('AS MINHAS ETIQUETAS', 'MY LABELS')}
              </div>
              {userLabels.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>
                  {L('Sem etiquetas', 'No labels')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {userLabels.map(label => (
                    <div key={label.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-inset)', borderRadius: 8 }}>
                      {/* Color dot */}
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        background: label.color?.backgroundColor ?? 'var(--c-mail)',
                        cursor: 'pointer',
                      }} />

                      {/* Name */}
                      {editingId === label.id ? (
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(label)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={() => saveEdit(label)}
                          className="glow-focus"
                          style={{
                            flex: 1, background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
                            borderRadius: 6, color: 'var(--ink)', fontSize: 13,
                            padding: '4px 8px', outline: 'none', '--accent': 'var(--c-mail)',
                          } as any}
                        />
                      ) : (
                        <span
                          onClick={() => { setEditingId(label.id); setEditValue(label.name) }}
                          style={{ flex: 1, fontSize: 13, color: 'var(--ink)', cursor: 'text' }}
                        >
                          {label.name}
                        </span>
                      )}

                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                        {label.totalCount > 0 ? label.totalCount : ''}
                      </span>

                      {confirmDelete === label.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => deleteLabel(label.id)}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)', border: '1px solid color-mix(in oklab, var(--neg) 30%, transparent)', cursor: 'pointer' }}
                          >
                            {L('Confirmar', 'Confirm')}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'transparent', color: 'var(--ink-faint)', border: '1px solid var(--edge)', cursor: 'pointer' }}
                          >
                            {L('Cancelar', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(label.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2, opacity: 0.7 }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create new label */}
            <div style={{ borderTop: '1px solid var(--edge-soft)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', marginBottom: 10 }}>
                {L('+ NOVA ETIQUETA', '+ NEW LABEL')}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createLabel() }}
                  placeholder={L('Nome da etiqueta...', 'Label name...')}
                  className="glow-focus"
                  style={{
                    flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                    borderRadius: 8, color: 'var(--ink)', fontSize: 13,
                    padding: '8px 12px', outline: 'none', '--accent': 'var(--c-mail)',
                  } as any}
                />
                <button
                  className="btn btn-accent"
                  onClick={createLabel}
                  disabled={creating || !newName.trim()}
                  style={{ fontSize: 13, padding: '8px 16px', '--accent': 'var(--c-mail)' } as any}
                >
                  {creating ? '...' : L('Criar', 'Create')}
                </button>
              </div>
              {/* Color swatches */}
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)', alignSelf: 'center' }}>
                  {L('Cor:', 'Color:')}
                </span>
                {GMAIL_COLORS.map(c => (
                  <button
                    key={c.bg}
                    onClick={() => setNewColor(newColor?.bg === c.bg ? null : c)}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', background: c.bg,
                      border: newColor?.bg === c.bg ? '2px solid var(--ink)' : '2px solid transparent',
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 10 }}>{error}</p>}
          </>
        )}
      </div>
    </Modal>
  )
}

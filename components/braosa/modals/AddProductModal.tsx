'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { BraosaProduct, PRODUCT_STATUS_META } from '@/lib/braosa'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: BraosaProduct | null
}

const CATEGORIES = [
  { value: 'tool',       label_pt: 'Ferramenta',  label_en: 'Tool' },
  { value: 'supplement', label_pt: 'Suplemento',  label_en: 'Supplement' },
  { value: 'companion',  label_pt: 'Companheiro', label_en: 'Companion' },
  { value: 'core',       label_pt: 'Core',        label_en: 'Core' },
]

const STATUSES = Object.entries(PRODUCT_STATUS_META).map(([value, meta]) => ({ value, ...meta }))

export default function AddProductModal({ open, onClose, onSaved, editing }: Props) {
  useLang()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<BraosaProduct['category']>('tool')
  const [status, setStatus] = useState<BraosaProduct['status']>('planned')
  const [url, setUrl] = useState('')
  const [priority, setPriority] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setDescription(editing.description ?? '')
      setCategory(editing.category)
      setStatus(editing.status)
      setUrl(editing.url ?? '')
      setPriority(editing.priority)
      setNotes(editing.notes ?? '')
    } else {
      setName('')
      setDescription('')
      setCategory('tool')
      setStatus('planned')
      setUrl('')
      setPriority(3)
      setNotes('')
    }
    setError('')
  }, [editing, open])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const method = editing ? 'PATCH' : 'POST'
      const endpoint = editing ? `/api/braosa/products/${editing.id}` : '/api/braosa/products'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, category, status, url: url || null, priority, notes: notes || null }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      onClose()
    } catch {
      setError(L('Erro ao guardar', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-inset)',
    border: '1px solid var(--edge)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 14,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em',
    color: 'var(--ink-faint)',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {editing ? L('Editar Produto', 'Edit Product') : L('Novo Produto', 'New Product')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{L('NOME', 'NAME')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="The Signet" />
          </div>

          <div>
            <label style={labelStyle}>{L('DESCRIÇÃO', 'DESCRIPTION')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('CATEGORIA', 'CATEGORY')}</label>
              <select value={category} onChange={e => setCategory(e.target.value as BraosaProduct['category'])} style={inputStyle}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{L(c.label_pt, c.label_en)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{L('ESTADO', 'STATUS')}</label>
              <select value={status} onChange={e => setStatus(e.target.value as BraosaProduct['status'])} style={inputStyle}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{L(s.label_pt, s.label_en)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div>
              <label style={labelStyle}>URL</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} style={inputStyle} placeholder="https://" />
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
            style={{ '--accent': 'var(--c-braosa)' } as React.CSSProperties}
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

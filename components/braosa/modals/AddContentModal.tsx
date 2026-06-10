'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { BraosaContent, PLATFORM_META } from '@/lib/braosa'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: BraosaContent | null
}

const STATUSES: { value: BraosaContent['status']; label_pt: string; label_en: string }[] = [
  { value: 'idea',      label_pt: 'Ideia',     label_en: 'Idea' },
  { value: 'draft',     label_pt: 'Rascunho',  label_en: 'Draft' },
  { value: 'ready',     label_pt: 'Pronto',    label_en: 'Ready' },
  { value: 'scheduled', label_pt: 'Agendado',  label_en: 'Scheduled' },
  { value: 'published', label_pt: 'Publicado', label_en: 'Published' },
]

export default function AddContentModal({ open, onClose, onSaved, editing }: Props) {
  useLang()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [platform, setPlatform] = useState<BraosaContent['platform']>('instagram')
  const [status, setStatus] = useState<BraosaContent['status']>('idea')
  const [scheduledFor, setScheduledFor] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setBody(editing.body ?? '')
      setPlatform(editing.platform)
      setStatus(editing.status)
      setScheduledFor(editing.scheduled_for ? editing.scheduled_for.slice(0, 16) : '')
      setTagsStr(editing.tags.join(', '))
      setNotes(editing.notes ?? '')
    } else {
      setTitle('')
      setBody('')
      setPlatform('instagram')
      setStatus('idea')
      setScheduledFor('')
      setTagsStr('')
      setNotes('')
    }
    setError('')
  }, [editing, open])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean)
      const method = editing ? 'PATCH' : 'POST'
      const endpoint = editing ? `/api/braosa/content/${editing.id}` : '/api/braosa/content'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: body || null,
          platform,
          status,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          tags,
          notes: notes || null,
        }),
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
    <Modal open={open} onClose={onClose} width={560}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {editing ? L('Editar Conteúdo', 'Edit Content') : L('Nova Ideia', 'New Idea')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{L('TÍTULO', 'TITLE')}</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>{L('PLATAFORMA', 'PLATFORM')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(PLATFORM_META) as BraosaContent['platform'][]).map(p => {
                const meta = PLATFORM_META[p]
                const isSelected = platform === p
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: `1px solid ${isSelected ? meta.color : 'var(--edge)'}`,
                      background: isSelected ? `color-mix(in oklch, ${meta.color} 16%, transparent)` : 'var(--bg-inset)',
                      color: isSelected ? meta.color : 'var(--ink-dim)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>{L('CORPO', 'BODY')}</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{L('ESTADO', 'STATUS')}</label>
              <select value={status} onChange={e => setStatus(e.target.value as BraosaContent['status'])} style={inputStyle}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{L(s.label_pt, s.label_en)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{L('AGENDAR PARA', 'SCHEDULE FOR')}</label>
              <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{L('TAGS (separadas por vírgula)', 'TAGS (comma separated)')}</label>
            <input type="text" value={tagsStr} onChange={e => setTagsStr(e.target.value)} style={inputStyle} placeholder="worldbuilding, names, tutorial" />
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
            disabled={saving || !title.trim()}
          >
            {saving ? L('A guardar…', 'Saving…') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

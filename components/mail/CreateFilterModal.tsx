'use client'

import { useState, useEffect } from 'react'
import { Icon, Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'

type UserLabel = { id: string; name: string }

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateFilterModal({ open, onClose, onCreated }: Props) {
  const lang = useLang()
  const [from, setFrom] = useState('')
  const [subject, setSubject] = useState('')
  const [hasWords, setHasWords] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [actionMarkRead, setActionMarkRead] = useState(false)
  const [actionStar, setActionStar] = useState(false)
  const [actionTrash, setActionTrash] = useState(false)
  const [labels, setLabels] = useState<UserLabel[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/mail/labels')
      .then(r => r.json())
      .then(d => {
        const system = new Set(['INBOX', 'SENT', 'DRAFT', 'STARRED', 'IMPORTANT', 'TRASH', 'SPAM',
          'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
          'CATEGORY_PERSONAL', 'UNREAD'])
        setLabels((d.labels ?? []).filter((l: any) => !system.has(l.id) && l.name))
      })
      .catch(() => {})
  }, [open])

  async function handleSubmit() {
    if (!from && !subject && !hasWords) {
      setError(L('Adiciona pelo menos um critério', 'Add at least one criterion'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: from || undefined,
          subject: subject || undefined,
          hasWords: hasWords || undefined,
          action: {
            addLabel: actionLabel || undefined,
            markRead: actionMarkRead || undefined,
            star: actionStar || undefined,
            trash: actionTrash || undefined,
          },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onCreated()
      onClose()
      // Reset
      setFrom(''); setSubject(''); setHasWords('')
      setActionLabel(''); setActionMarkRead(false); setActionStar(false); setActionTrash(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
    borderRadius: 8, color: 'var(--ink)', fontSize: 13,
    padding: '8px 12px', outline: 'none',
    ['--accent' as any]: 'var(--c-mail)',
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    borderRadius: 8, cursor: 'pointer',
    background: active ? 'color-mix(in oklab, var(--c-mail) 12%, transparent)' : 'var(--bg-inset)',
    border: `1px solid ${active ? 'color-mix(in oklab, var(--c-mail) 30%, transparent)' : 'var(--edge)'}`,
    color: active ? 'var(--c-mail)' : 'var(--ink-dim)',
    fontSize: 13, fontWeight: active ? 600 : 400,
  })

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Novo Filtro', 'New Filter')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Criteria */}
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
            {L('CRITÉRIOS', 'CRITERIA')}
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>
              {L('De (From):', 'From:')}
            </label>
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="noreply@example.com" className="glow-focus" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>
              {L('Assunto contém:', 'Subject contains:')}
            </label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={L('Fatura', 'Invoice')} className="glow-focus" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>
              {L('Contém palavras:', 'Has words:')}
            </label>
            <input value={hasWords} onChange={e => setHasWords(e.target.value)} placeholder={L('palavras-chave', 'keywords')} className="glow-focus" style={inputStyle} />
          </div>

          {/* Actions */}
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.1em', marginTop: 4 }}>
            {L('AÇÕES', 'ACTIONS')}
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>
              {L('Aplicar etiqueta:', 'Apply label:')}
            </label>
            <select
              value={actionLabel}
              onChange={e => setActionLabel(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">{L('— Nenhuma —', '— None —')}</option>
              {labels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button style={toggleStyle(actionMarkRead)} onClick={() => setActionMarkRead(v => !v)}>
              {actionMarkRead && <Icon name="check" size={14} />}
              {L('Marcar como lido', 'Mark as read')}
            </button>
            <button style={toggleStyle(actionStar)} onClick={() => setActionStar(v => !v)}>
              {actionStar && <Icon name="check" size={14} />}
              {L('Marcar como favorito', 'Star it')}
            </button>
            <button style={toggleStyle(actionTrash)} onClick={() => setActionTrash(v => !v)}>
              {actionTrash && <Icon name="check" size={14} />}
              {L('Enviar para o lixo', 'Send to trash')}
            </button>
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ fontSize: 13, padding: '8px 16px' }}>
            {L('Cancelar', 'Cancel')}
          </button>
          <button
            className="btn btn-accent"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ fontSize: 13, padding: '8px 16px', '--accent': 'var(--c-mail)' } as any}
          >
            {submitting ? '...' : L('Criar Filtro', 'Create Filter')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Icon, Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
}

export default function ComposeModal({ open, onClose }: Props) {
  useLang()
  const [to, setTo] = useState('')
  const [toTags, setToTags] = useState<string[]>([])
  const [cc, setCc] = useState('')
  const [ccTags, setCcTags] = useState<string[]>([])
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [instruction, setInstruction] = useState('')
  const [showInstruction, setShowInstruction] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function addTag(value: string, tags: string[], setTags: (t: string[]) => void, setInput: (s: string) => void) {
    const emails = value.split(/[\s,;]+/).filter(e => e.includes('@'))
    if (emails.length > 0) {
      setTags([...tags, ...emails])
      setInput('')
    }
  }

  function removeTag(index: number, tags: string[], setTags: (t: string[]) => void) {
    setTags(tags.filter((_, i) => i !== index))
  }

  async function handleAiGenerate() {
    if (!instruction.trim() && !subject.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const draftRes = await fetch('/api/mail/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: '__compose__',
          instruction: `Write a new email${subject ? ` about: ${subject}` : ''}. ${instruction}. To: ${[...toTags, to].filter(Boolean).join(', ')}`,
        }),
      })
      const data = await draftRes.json()
      if (data.draft) {
        setBody(data.draft)
        setShowInstruction(false)
        setTimeout(() => bodyRef.current?.focus(), 100)
      } else {
        setError(data.error ?? 'AI error')
      }
    } catch {
      setError(L('Erro ao gerar', 'Generation error'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    const allTo = [...toTags, to].filter(Boolean)
    if (allTo.length === 0 || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: allTo,
          cc: [...ccTags, cc].filter(Boolean),
          subject,
          body,
        }),
      })
      const data = await res.json()
      if (data.messageId) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onClose()
          resetForm()
        }, 1200)
      } else {
        setError(data.error ?? 'Send failed')
      }
    } catch {
      setError(L('Erro ao enviar', 'Send error'))
    } finally {
      setSending(false)
    }
  }

  async function handleSaveDraft() {
    const allTo = [...toTags, to].filter(Boolean)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/messages/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: allTo,
          cc: [...ccTags, cc].filter(Boolean),
          subject,
          body,
        }),
      })
      const data = await res.json()
      if (data.draftId) {
        onClose()
        resetForm()
      } else {
        setError(data.error ?? 'Draft failed')
      }
    } catch {
      setError(L('Erro ao guardar', 'Save error'))
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setTo(''); setToTags([])
    setCc(''); setCcTags([])
    setShowCc(false)
    setSubject(''); setBody('')
    setInstruction(''); setShowInstruction(false)
    setError(null)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-inset)', border: '1px solid var(--edge)',
    borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
    padding: '8px 12px', outline: 'none',
    '--accent': 'var(--c-mail)',
  } as any

  return (
    <Modal open={open} onClose={() => { onClose(); resetForm() }} width={640}>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Escrever email', 'Compose email')}
          </h3>
          <button
            onClick={() => { onClose(); resetForm() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* To field */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>
            {L('PARA', 'TO')}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
            background: 'var(--bg-inset)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)', padding: '6px 10px', minHeight: 38,
          }}>
            {toTags.map((tag, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'color-mix(in oklab, var(--c-mail) 12%, transparent)',
                color: 'var(--c-mail)', borderRadius: 99, padding: '2px 8px',
                fontSize: 12, fontWeight: 500,
              }}>
                {tag}
                <button
                  onClick={() => removeTag(i, toTags, setToTags)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="glow-focus"
              value={to}
              onChange={e => setTo(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
                  e.preventDefault()
                  addTag(to, toTags, setToTags, setTo)
                }
                if (e.key === 'Backspace' && !to && toTags.length > 0) {
                  setToTags(toTags.slice(0, -1))
                }
              }}
              onBlur={() => { if (to) addTag(to, toTags, setToTags, setTo) }}
              placeholder={toTags.length === 0 ? L('email@exemplo.com', 'email@example.com') : ''}
              style={{
                flex: 1, minWidth: 120, background: 'none', border: 'none', outline: 'none',
                color: 'var(--ink)', fontSize: 13, padding: 0,
              }}
            />
          </div>
          {!showCc && (
            <button
              onClick={() => setShowCc(true)}
              style={{ fontSize: 11, color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}
            >
              + Cc
            </button>
          )}
        </div>

        {/* Cc field */}
        {showCc && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>Cc</div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
              background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', padding: '6px 10px', minHeight: 38,
            }}>
              {ccTags.map((tag, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'color-mix(in oklab, var(--c-mail) 12%, transparent)',
                  color: 'var(--c-mail)', borderRadius: 99, padding: '2px 8px',
                  fontSize: 12, fontWeight: 500,
                }}>
                  {tag}
                  <button onClick={() => removeTag(i, ccTags, setCcTags)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
                </span>
              ))}
              <input
                className="glow-focus"
                value={cc}
                onChange={e => setCc(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
                    e.preventDefault()
                    addTag(cc, ccTags, setCcTags, setCc)
                  }
                }}
                onBlur={() => { if (cc) addTag(cc, ccTags, setCcTags, setCc) }}
                placeholder={ccTags.length === 0 ? L('email@exemplo.com', 'email@example.com') : ''}
                style={{ flex: 1, minWidth: 120, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 13, padding: 0 }}
              />
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>
            {L('ASSUNTO', 'SUBJECT')}
          </div>
          <input
            className="glow-focus"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={L('Assunto', 'Subject')}
            style={inputStyle}
          />
        </div>

        {/* Body */}
        <div>
          <textarea
            ref={bodyRef}
            className="glow-focus"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={L('Mensagem...', 'Message...')}
            rows={8}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 200,
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* AI instruction input */}
        {showInstruction && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="glow-focus"
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder={L('Descreve o email que o AI deve escrever...', 'Describe the email you want AI to write...')}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiGenerate() } }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              className="btn btn-accent"
              onClick={handleAiGenerate}
              disabled={generating}
              style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0, '--accent': 'var(--c-mail)' } as any}
            >
              {generating ? '...' : L('Gerar', 'Generate')}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--neg)' }}>{error}</p>
        )}

        {success && (
          <p style={{ fontSize: 12, color: 'var(--c-cal)', textAlign: 'center' }}>
            {L('Enviado!', 'Sent!')}
          </p>
        )}

        {/* Bottom toolbar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--edge-soft)', paddingTop: 14 }}>
          <button
            className="btn btn-accent"
            onClick={handleSend}
            disabled={sending || [...toTags, to].filter(Boolean).length === 0 || !body.trim()}
            style={{ fontSize: 13, padding: '8px 18px', '--accent': 'var(--c-mail)' } as any}
          >
            <Icon name="send" size={13} />
            {sending ? '...' : L('Enviar', 'Send')}
          </button>

          <button
            className="btn"
            onClick={handleSaveDraft}
            disabled={saving}
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            <Icon name="archive" size={12} />
            {saving ? '...' : L('Guardar rascunho', 'Save draft')}
          </button>

          <button
            className="btn"
            onClick={() => setShowInstruction(s => !s)}
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            ✨ {L('AI', 'AI')}
          </button>

          <button
            className="btn"
            onClick={() => { onClose(); resetForm() }}
            style={{ fontSize: 12, padding: '7px 14px', marginLeft: 'auto', color: 'var(--ink-faint)' }}
          >
            {L('Descartar', 'Discard')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

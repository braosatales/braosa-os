'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon, Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { relativeTime, formatDate } from '@/lib/date'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { MailThread, MailMessage } from '@/lib/mail'

// ─── HTML sanitiser ────────────────────────────────────────────────────────────

function sanitizeHtml(html: string, showImages: boolean): string {
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
  if (!showImages) {
    clean = clean.replace(/<img[^>]*>/gi, '<span style="display:none"></span>')
  }
  return clean
}

// ─── MessageItem ───────────────────────────────────────────────────────────────

function MessageItem({ message, defaultExpanded }: { message: MailMessage; defaultExpanded: boolean }) {
  useLang()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showImages, setShowImages] = useState(false)
  const isHtml = message.body.trim().startsWith('<')

  return (
    <div style={{ border: '1px solid var(--edge-soft)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-raised)' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: expanded ? 'transparent' : 'var(--bg-raised)' }}
      >
        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'color-mix(in oklab, var(--c-mail) 16%, var(--bg-raised-2))', border: '1px solid color-mix(in oklab, var(--c-mail) 24%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--c-mail)' }}>
          {(message.from.name ?? message.from.email).slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {message.from.name ?? message.from.email}
            {message.from.name && (
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 6 }}>&lt;{message.from.email}&gt;</span>
            )}
          </div>
          {!expanded && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.snippet}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{relativeTime(message.date)}</span>
          <span style={{ color: 'var(--ink-faint)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <Icon name="chevron-down" size={14} />
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {!showImages && isHtml && message.body.includes('<img') && (
            <button className="btn" onClick={() => setShowImages(true)} style={{ fontSize: 11, padding: '4px 10px', marginBottom: 10 }}>
              <Icon name="eye" size={11} />
              {L('Mostrar imagens', 'Show images')}
            </button>
          )}
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)', overflowX: 'auto' }}>
            {isHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body, showImages) }} style={{ wordBreak: 'break-word' }} />
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{message.body}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ReplyArea ─────────────────────────────────────────────────────────────────

type ReplyMode = 'reply' | 'reply-all' | 'forward'

function ReplyArea({ thread, onSent }: { thread: MailThread; onSent: () => void }) {
  useLang()
  const [mode, setMode] = useState<ReplyMode>('reply')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [instruction, setInstruction] = useState('')
  const [showInstruction, setShowInstruction] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Listen for focus-reply event from keyboard shortcut
  useEffect(() => {
    function handler() { editorRef.current?.focus() }
    window.addEventListener('braosa:mail:focus-reply', handler)
    return () => window.removeEventListener('braosa:mail:focus-reply', handler)
  }, [])

  // Pre-fill To/Cc based on mode
  useEffect(() => {
    const lastMsg = thread.messages[thread.messages.length - 1]
    if (mode === 'reply') {
      setTo(lastMsg?.from.email ?? '')
      setCc('')
      if (editorRef.current) editorRef.current.innerHTML = ''
    } else if (mode === 'reply-all') {
      const allEmails = new Set<string>()
      thread.messages.forEach(msg => {
        allEmails.add(msg.from.email)
        msg.to.forEach(t => allEmails.add(t.email))
      })
      const ccEmails = new Set<string>()
      thread.messages.forEach(msg => msg.cc.forEach(c => ccEmails.add(c.email)))
      setTo(Array.from(allEmails).join(', '))
      setCc(Array.from(ccEmails).join(', '))
      if (editorRef.current) editorRef.current.innerHTML = ''
    } else if (mode === 'forward') {
      setTo('')
      setCc('')
      const lastMsg = thread.messages[thread.messages.length - 1]
      if (lastMsg && editorRef.current) {
        const fromLabel = lastMsg.from.name ? `${lastMsg.from.name} &lt;${lastMsg.from.email}&gt;` : lastMsg.from.email
        const dateLabel = formatDate(lastMsg.date, 'long')
        const quote = lastMsg.body.trim().startsWith('<')
          ? lastMsg.body
          : lastMsg.body.replace(/\n/g, '<br>')
        editorRef.current.innerHTML = `<br><br><div style="border-left:3px solid var(--edge);padding-left:12px;color:var(--ink-dim);margin-top:12px"><p style="font-size:12px;color:var(--ink-faint);margin-bottom:8px">------- ${L('Mensagem encaminhada', 'Forwarded message')} -------<br>De: ${fromLabel}<br>Data: ${dateLabel}<br>Assunto: ${thread.subject}</p>${quote}</div>`
      }
    }
  }, [mode, thread])

  // Formatting
  function format(cmd: string) {
    document.execCommand(cmd, false)
    editorRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); format('bold') }
      if (e.key === 'i') { e.preventDefault(); format('italic') }
      if (e.key === 'u') { e.preventDefault(); format('underline') }
    }
  }

  async function handleAiDraft() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, instruction: instruction || undefined }),
      })
      const data = await res.json()
      if (data.draft) {
        if (editorRef.current) {
          editorRef.current.innerText = data.draft
        }
        setShowInstruction(false)
        setTimeout(() => editorRef.current?.focus(), 100)
      } else {
        setError(data.error ?? 'AI error')
      }
    } catch {
      setError(L('Erro ao gerar rascunho', 'Error generating draft'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    const body = editorRef.current?.innerHTML ?? ''
    if (!body.replace(/<[^>]*>/g, '').trim() || !to.trim()) return
    setSending(true)
    setError(null)
    try {
      const lastMsg = thread.messages[thread.messages.length - 1]
      let subject = thread.subject
      if (mode === 'forward') subject = `Fwd: ${subject}`
      else subject = `Re: ${subject}`

      const res = await fetch('/api/mail/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.split(',').map(s => s.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          subject,
          body,
          isHtml: true,
          inReplyTo: mode !== 'forward' ? lastMsg?.id : undefined,
          threadId: mode !== 'forward' ? thread.id : undefined,
        }),
      })
      const data = await res.json()
      if (data.messageId) {
        if (editorRef.current) editorRef.current.innerHTML = ''
        setTo(thread.messages[thread.messages.length - 1]?.from.email ?? '')
        setCc('')
        setMode('reply')
        onSent()
      } else {
        setError(data.error ?? 'Send failed')
      }
    } catch {
      setError(L('Erro ao enviar', 'Send error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--edge-soft)', padding: '14px 16px', background: 'var(--bg-base)', flexShrink: 0 }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['reply', 'reply-all', 'forward'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              fontSize: 12, padding: '4px 11px', borderRadius: 99,
              background: mode === m ? 'var(--c-mail-dim)' : 'transparent',
              border: `1px solid ${mode === m ? 'var(--c-mail)' : 'var(--edge)'}`,
              color: mode === m ? 'var(--c-mail)' : 'var(--ink-dim)',
              cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === 'reply' ? L('Responder', 'Reply') : m === 'reply-all' ? L('Resp. a Todos', 'Reply All') : L('Encaminhar', 'Forward')}
          </button>
        ))}
      </div>

      {/* To field */}
      <input
        value={to}
        onChange={e => setTo(e.target.value)}
        placeholder={L('Para...', 'To...')}
        className="glow-focus"
        style={{
          width: '100%', marginBottom: 6,
          background: 'var(--bg-inset)', border: '1px solid var(--edge)',
          borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
          padding: '6px 10px', outline: 'none', '--accent': 'var(--c-mail)',
        } as any}
      />

      {/* Cc field (for reply-all or forward) */}
      {(mode === 'reply-all' || cc) && (
        <input
          value={cc}
          onChange={e => setCc(e.target.value)}
          placeholder={L('CC...', 'CC...')}
          className="glow-focus"
          style={{
            width: '100%', marginBottom: 6,
            background: 'var(--bg-inset)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
            padding: '6px 10px', outline: 'none', '--accent': 'var(--c-mail)',
          } as any}
        />
      )}

      {/* Rich text toolbar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
        {[
          { cmd: 'bold', label: 'B', style: { fontWeight: 700 } },
          { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' } },
          { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' } },
        ].map(({ cmd, label, style }) => (
          <button
            key={cmd}
            onMouseDown={e => { e.preventDefault(); format(cmd) }}
            title={`Ctrl+${label}`}
            style={{
              width: 26, height: 26, borderRadius: 6, fontSize: 12,
              background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
              color: 'var(--ink-dim)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              ...style,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenteditable editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        data-placeholder={L('Escreve a tua resposta...', 'Write your reply...')}
        className="glow-focus reply-editor"
        style={{
          minHeight: 80, padding: '9px 12px',
          background: 'var(--bg-inset)', border: '1px solid var(--edge)',
          borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
          lineHeight: 1.5, outline: 'none', overflowY: 'auto', maxHeight: 200,
          ['--accent' as any]: 'var(--c-mail)',
        }}
      />

      {/* AI instruction */}
      {showInstruction && (
        <input
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder={L('Diz ao AI o que responder...', 'Tell AI what to reply...')}
          className="glow-focus"
          style={{
            width: '100%', marginTop: 8,
            background: 'var(--bg-inset)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
            padding: '7px 10px', outline: 'none', '--accent': 'var(--c-mail)',
          } as any}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiDraft() } }}
        />
      )}

      {error && <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 6 }}>{error}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-accent"
          onClick={handleSend}
          disabled={sending}
          style={{ fontSize: 13, padding: '7px 16px', '--accent': 'var(--c-mail)' } as any}
        >
          <Icon name="send" size={13} />
          {sending ? '...' : L('Enviar', 'Send')}
        </button>

        <button
          className="btn"
          onClick={() => {
            setShowInstruction(s => !s)
            if (!showInstruction) setTimeout(() => handleAiDraft(), 50)
          }}
          disabled={generating}
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          ✨ {generating ? '...' : L('Rascunho AI', 'AI Draft')}
        </button>

        {showInstruction && !generating && (
          <button
            className="btn btn-accent"
            onClick={handleAiDraft}
            disabled={generating}
            style={{ fontSize: 12, padding: '6px 12px', '--accent': 'var(--c-mail)' } as any}
          >
            {L('Gerar', 'Generate')}
          </button>
        )}

        <button
          className="btn"
          onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ''; setError(null) }}
          style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto', color: 'var(--ink-faint)' }}
        >
          {L('Descartar', 'Discard')}
        </button>
      </div>
    </div>
  )
}

// ─── ThreadDetail ──────────────────────────────────────────────────────────────

type Props = {
  threadId: string | null
  onClose: () => void
  onAction?: () => void
}

export default function ThreadDetail({ threadId, onClose, onAction }: Props) {
  useLang()
  const isMobile = useIsMobile()
  const [thread, setThread] = useState<MailThread | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendToast, setSendToast] = useState(false)
  const [extracting, setExtracting] = useState(false)

  useEffect(() => {
    if (!threadId) { setThread(null); return }
    setLoading(true)
    fetch(`/api/mail/threads/${threadId}`)
      .then(r => r.json())
      .then(d => setThread(d.thread ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [threadId])

  async function handleStar() {
    if (!thread) return
    const isStarred = thread.starred
    await fetch(`/api/mail/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isStarred ? { removeLabels: ['STARRED'] } : { addLabels: ['STARRED'] }),
    })
    setThread(t => t ? { ...t, starred: !isStarred } : t)
    onAction?.()
  }

  async function handleMarkUnread() {
    if (!thread) return
    await fetch(`/api/mail/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addLabels: ['UNREAD'] }),
    })
    setThread(t => t ? { ...t, read: false } : t)
    onAction?.()
  }

  async function handleTrash() {
    if (!thread) return
    await fetch(`/api/mail/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addLabels: ['TRASH'], removeLabels: ['INBOX'] }),
    })
    onClose()
    onAction?.()
  }

  async function handleExtractContact() {
    if (!thread) return
    const lastMsg = thread.messages[thread.messages.length - 1]
    if (!lastMsg) return
    setExtracting(true)
    try {
      await fetch('/api/mail/extract-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: lastMsg.id }),
      })
    } finally {
      setExtracting(false)
    }
  }

  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {loading || !thread ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--ink-faint)' }}>{loading ? L('A carregar...', 'Loading...') : ''}</span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--edge-soft)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              {isMobile && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', padding: 0, flexShrink: 0, marginTop: 3 }}>
                  <Icon name="chevron-left" size={18} />
                </button>
              )}
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', flex: 1, lineHeight: 1.3 }}>
                {thread.subject || L('(sem assunto)', '(no subject)')}
              </h2>
              {!isMobile && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2, flexShrink: 0 }}>
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn" onClick={handleStar} style={{ fontSize: 11.5, padding: '5px 10px', color: thread.starred ? 'var(--c-fin)' : undefined }}>
                <Icon name={thread.starred ? 'star-fill' : 'star'} size={12} />
                {thread.starred ? L('Favorito', 'Starred') : L('Favorito', 'Star')}
              </button>
              <button className="btn" onClick={handleMarkUnread} style={{ fontSize: 11.5, padding: '5px 10px' }}>
                <Icon name="mail" size={12} />
                {L('Não lido', 'Mark unread')}
              </button>
              <button className="btn" onClick={handleTrash} style={{ fontSize: 11.5, padding: '5px 10px', color: 'var(--neg)' }}>
                <Icon name="trash" size={12} />
                {L('Lixo', 'Trash')}
              </button>
              <button className="btn" onClick={handleExtractContact} disabled={extracting} style={{ fontSize: 11.5, padding: '5px 10px', color: 'var(--c-task)' }}>
                <Icon name="users" size={12} />
                {extracting ? '...' : L('Extrair Contacto', 'Extract Contact')}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="hide-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thread.messages.map((msg, i) => (
              <MessageItem key={msg.id} message={msg} defaultExpanded={i === thread.messages.length - 1 || !msg.read} />
            ))}
          </div>

          {/* Reply area */}
          <ReplyArea
            thread={thread}
            onSent={() => {
              setSendToast(true)
              setTimeout(() => setSendToast(false), 3000)
              onAction?.()
            }}
          />
        </>
      )}

      {/* Send toast */}
      {sendToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--pos)', color: 'white', borderRadius: 'var(--radius)',
          padding: '10px 20px', zIndex: 9999, fontSize: 14, fontWeight: 600,
          whiteSpace: 'nowrap', animation: 'toast-slide-up 0.3s ease both',
          boxShadow: '0 8px 24px -8px oklch(0 0 0 / 0.6)',
        }}>
          {L('Email enviado ✓', 'Email sent ✓')}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--bg-base)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight 0.28s cubic-bezier(.2,.8,.2,1) both',
      }}>
        {inner}
      </div>
    )
  }

  return inner
}

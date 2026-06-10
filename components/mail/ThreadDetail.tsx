'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon, Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { relativeTime, formatDate } from '@/lib/date'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { MailThread, MailMessage } from '@/lib/mail'

// ─── Sanitize HTML ────────────────────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
  'a', 'b', 'br', 'blockquote', 'cite', 'code', 'del', 'div', 'em',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'li',
  'ol', 'p', 'pre', 'q', 's', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
])

function sanitizeHtml(html: string, showImages: boolean): string {
  // Remove scripts, styles, events
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

// ─── Message component ────────────────────────────────────────────────────────

function MessageItem({
  message,
  defaultExpanded,
}: {
  message: MailMessage
  defaultExpanded: boolean
}) {
  useLang()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showImages, setShowImages] = useState(false)
  const isHtml = message.body.trim().startsWith('<')

  return (
    <div style={{
      border: '1px solid var(--edge-soft)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--bg-raised)',
    }}>
      {/* Message header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
          background: expanded ? 'transparent' : 'var(--bg-raised)',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'color-mix(in oklab, var(--c-mail) 16%, var(--bg-raised-2))',
          border: '1px solid color-mix(in oklab, var(--c-mail) 24%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--c-mail)',
        }}>
          {(message.from.name ?? message.from.email).slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {message.from.name ?? message.from.email}
            {message.from.name && (
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 6 }}>
                &lt;{message.from.email}&gt;
              </span>
            )}
          </div>
          {!expanded && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {message.snippet}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
            {relativeTime(message.date)}
          </span>
          <span style={{ color: 'var(--ink-faint)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <Icon name="chevron-down" size={14} />
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* Show images toggle */}
          {!showImages && isHtml && message.body.includes('<img') && (
            <button
              className="btn"
              onClick={() => setShowImages(true)}
              style={{ fontSize: 11, padding: '4px 10px', marginBottom: 10 }}
            >
              <Icon name="eye" size={11} />
              {L('Mostrar imagens', 'Show images')}
            </button>
          )}

          {/* Body */}
          <div style={{
            fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)',
            overflowX: 'auto',
          }}>
            {isHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body, showImages) }}
                style={{ wordBreak: 'break-word' }}
              />
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                {message.body}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reply area ───────────────────────────────────────────────────────────────

type ReplyMode = 'reply' | 'forward'

function ReplyArea({
  thread,
  onSent,
}: {
  thread: MailThread
  onSent: () => void
}) {
  useLang()
  const [mode, setMode] = useState<ReplyMode>('reply')
  const [body, setBody] = useState('')
  const [to, setTo] = useState('')
  const [instruction, setInstruction] = useState('')
  const [showInstruction, setShowInstruction] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const lastMsg = thread.messages[thread.messages.length - 1]
    if (mode === 'reply' && lastMsg) {
      setTo(lastMsg.from.email)
    } else {
      setTo('')
    }
  }, [mode, thread])

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
        setBody(data.draft)
        setShowInstruction(false)
        setTimeout(() => textareaRef.current?.focus(), 100)
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
    if (!body.trim() || !to.trim()) return
    setSending(true)
    setError(null)
    try {
      const lastMsg = thread.messages[thread.messages.length - 1]
      const res = await fetch('/api/mail/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [to],
          subject: mode === 'forward' ? `Fwd: ${thread.subject}` : `Re: ${thread.subject}`,
          body,
          inReplyTo: mode === 'reply' ? lastMsg?.id : undefined,
          threadId: mode === 'reply' ? thread.id : undefined,
        }),
      })
      const data = await res.json()
      if (data.messageId) {
        setBody('')
        setTo('')
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
    <div style={{
      borderTop: '1px solid var(--edge-soft)',
      padding: '14px 16px',
      background: 'var(--bg-base)',
      flexShrink: 0,
    }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['reply', 'forward'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 99,
              background: mode === m ? 'var(--c-mail-dim)' : 'transparent',
              border: `1px solid ${mode === m ? 'var(--c-mail)' : 'var(--edge)'}`,
              color: mode === m ? 'var(--c-mail)' : 'var(--ink-dim)',
              cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === 'reply' ? L('Responder', 'Reply') : L('Encaminhar', 'Forward')}
          </button>
        ))}
      </div>

      {/* To field for forward */}
      {mode === 'forward' && (
        <input
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder={L('Para...', 'To...')}
          className="glow-focus"
          style={{
            width: '100%', marginBottom: 8,
            background: 'var(--bg-inset)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
            padding: '7px 10px', outline: 'none',
            '--accent': 'var(--c-mail)',
          } as any}
        />
      )}

      {/* Body textarea */}
      <textarea
        ref={textareaRef}
        className="glow-focus"
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={L('Escreve a tua resposta...', 'Write your reply...')}
        rows={4}
        style={{
          width: '100%', resize: 'vertical', minHeight: 80,
          background: 'var(--bg-inset)', border: '1px solid var(--edge)',
          borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
          padding: '9px 12px', outline: 'none', lineHeight: 1.5,
          '--accent': 'var(--c-mail)',
        } as any}
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
            padding: '7px 10px', outline: 'none',
            '--accent': 'var(--c-mail)',
          } as any}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiDraft() } }}
        />
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 6 }}>{error}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-accent"
          onClick={handleSend}
          disabled={sending || !body.trim()}
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
          onClick={() => { setBody(''); setError(null) }}
          style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto', color: 'var(--ink-faint)' }}
        >
          {L('Descartar', 'Discard')}
        </button>
      </div>
    </div>
  )
}

// ─── ThreadDetail ─────────────────────────────────────────────────────────────

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
  const [sentConfirm, setSentConfirm] = useState(false)
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
      body: JSON.stringify(
        isStarred
          ? { removeLabels: ['STARRED'] }
          : { addLabels: ['STARRED'] }
      ),
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
      const res = await fetch('/api/mail/extract-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: lastMsg.id }),
      })
      await res.json()
    } finally {
      setExtracting(false)
    }
  }

  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {loading || !thread ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--ink-faint)' }}>
            {loading ? L('A carregar...', 'Loading...') : ''}
          </span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--edge-soft)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              {isMobile && (
                <button
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', padding: 0, flexShrink: 0, marginTop: 3 }}
                >
                  <Icon name="chevron-left" size={18} />
                </button>
              )}
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17, fontWeight: 600, color: 'var(--ink)', flex: 1,
                lineHeight: 1.3,
              }}>
                {thread.subject || L('(sem assunto)', '(no subject)')}
              </h2>
              {!isMobile && (
                <button
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2, flexShrink: 0 }}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className="btn"
                onClick={handleStar}
                style={{ fontSize: 11.5, padding: '5px 10px', color: thread.starred ? 'var(--c-fin)' : undefined }}
              >
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
              <button
                className="btn"
                onClick={handleExtractContact}
                disabled={extracting}
                style={{ fontSize: 11.5, padding: '5px 10px', color: 'var(--c-task)' }}
              >
                <Icon name="users" size={12} />
                {extracting ? '...' : L('Extrair Contacto', 'Extract Contact')}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="hide-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thread.messages.map((msg, i) => (
              <MessageItem
                key={msg.id}
                message={msg}
                defaultExpanded={i === thread.messages.length - 1 || !msg.read}
              />
            ))}
          </div>

          {/* Sent confirm */}
          {sentConfirm && (
            <div style={{
              padding: '8px 16px', background: 'color-mix(in oklab, var(--c-cal) 10%, transparent)',
              borderTop: '1px solid color-mix(in oklab, var(--c-cal) 20%, transparent)',
              fontSize: 12, color: 'var(--c-cal)', textAlign: 'center',
            }}>
              {L('Enviado!', 'Sent!')}
            </div>
          )}

          {/* Reply area */}
          <ReplyArea
            thread={thread}
            onSent={() => {
              setSentConfirm(true)
              setTimeout(() => setSentConfirm(false), 3000)
              onAction?.()
            }}
          />
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Modal open={!!threadId} onClose={onClose}>
        <div style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          {inner}
        </div>
      </Modal>
    )
  }

  return inner
}

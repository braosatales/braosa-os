'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui'
import { L } from '@/lib/i18n'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLoading(true)
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await r.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, timestamp: new Date().toISOString() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: L('Erro ao conectar. Tenta novamente.', 'Connection error. Please try again.'), timestamp: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--edge)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Braosa AI
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="pulse" style={{ width: 8, height: 8, background: 'var(--c-task)', borderRadius: 99, display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>Online</span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setMessages([])}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6 }}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && !loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ color: 'var(--c-task)', opacity: 0.5 }}>
              <Icon name="wand" size={32} />
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', textAlign: 'center' }}>
              {L('Olá! Como posso ajudar hoje?', 'Hi! How can I help today?')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', textAlign: 'center' }}>
              {L('Faz-me uma pergunta…', 'Ask me anything…')}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={msg.role === 'user' ? {
                  marginLeft: 'auto',
                  maxWidth: '70%',
                  background: 'var(--c-task-dim)',
                  border: '1px solid color-mix(in oklch, var(--c-task) 30%, transparent)',
                  borderRadius: '14px 14px 4px 14px',
                  padding: '11px 15px',
                  fontSize: 13.5,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                } : {
                  marginRight: 'auto',
                  maxWidth: '75%',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--edge)',
                  borderRadius: '14px 14px 14px 4px',
                  padding: '13px 17px',
                  fontSize: 13.5,
                  color: 'var(--ink-soft)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: '14px 14px 14px 4px', padding: '13px 17px' }}>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ink-faint)', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.18}s`, display: 'inline-block' }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--edge-soft)', padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 96) + 'px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={L('Mensagem ao Braosa…', 'Message Braosa…')}
          className="glow-focus"
          style={{
            flex: 1,
            maxHeight: 96,
            overflowY: 'auto',
            background: 'var(--bg-inset)',
            border: '1px solid var(--edge)',
            borderRadius: 'var(--radius)',
            padding: '10px 13px',
            fontSize: 13.5,
            color: 'var(--ink)',
            resize: 'none',
            fontFamily: 'var(--font-body)',
            outline: 'none',
            // @ts-expect-error css custom property
            '--accent': 'var(--c-task)',
          }}
        />
        <button
          onClick={handleSend}
          disabled={input.trim() === '' || loading}
          style={{
            width: 40,
            height: 40,
            background: 'var(--c-task-dim)',
            border: '1px solid var(--c-task)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() === '' || loading ? 'not-allowed' : 'pointer',
            opacity: input.trim() === '' || loading ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <Icon name="send" size={15} />
        </button>
      </div>
    </div>
  )
}

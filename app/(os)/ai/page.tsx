'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui'
import { useLang } from '@/lib/i18n'
import { relativeTime } from '@/lib/date'
import { getUser } from '@/lib/user'
import { useNavigation } from '@/app/(os)/layout'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string | null
  message_count: number
  updated_at: string
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

// Regex-based markdown renderer — handles bold, italic, bullet lists, numbered lists
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>
    return <span key={i}>{part}</span>
  })
}

function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(Boolean)
        if (lines.length === 0) return null
        const allBullet = lines.every(l => /^[-*•]\s/.test(l))
        const allNumbered = lines.every(l => /^\d+\.\s/.test(l))
        if (allBullet) {
          return (
            <ul key={bi} style={{ paddingLeft: 18, margin: bi === 0 ? 0 : '8px 0 0', listStyle: 'disc' }}>
              {lines.map((l, li) => (
                <li key={li} style={{ marginBottom: 3 }}>{renderInline(l.replace(/^[-*•]\s/, ''))}</li>
              ))}
            </ul>
          )
        }
        if (allNumbered) {
          return (
            <ol key={bi} style={{ paddingLeft: 18, margin: bi === 0 ? 0 : '8px 0 0' }}>
              {lines.map((l, li) => (
                <li key={li} style={{ marginBottom: 3 }}>{renderInline(l.replace(/^\d+\.\s/, ''))}</li>
              ))}
            </ol>
          )
        }
        // Mixed or plain paragraph — render lines separated by single newlines
        return (
          <p key={bi} style={{ margin: bi === 0 ? 0 : '8px 0 0', lineHeight: 1.6 }}>
            {lines.map((line, li) => (
              <span key={li}>{renderInline(line)}{li < lines.length - 1 ? <br /> : null}</span>
            ))}
          </p>
        )
      })}
    </>
  )
}

// Detect which OS sections an assistant response references
function detectActions(text: string, lang: string): { label: string; target: string }[] {
  const lower = text.toLowerCase()
  const actions: { label: string; target: string }[] = []
  if (/\btarefa|\btask|\btodo/i.test(lower))
    actions.push({ label: lang === 'en' ? 'View Tasks' : 'Ver Tarefas', target: 'tasks' })
  if (/financ|dinheiro|money|\bconta|\bdebt|\bdívida|net worth|poupan/i.test(lower))
    actions.push({ label: lang === 'en' ? 'View Finances' : 'Ver Finanças', target: 'finances' })
  if (/workout|treino|training|exerc|\bgym|\bsessão|\bplano/i.test(lower))
    actions.push({ label: lang === 'en' ? 'View Health' : 'Ver Treino', target: 'health' })
  if (/\bnota|\bnote/i.test(lower))
    actions.push({ label: lang === 'en' ? 'View Notes' : 'Ver Notas', target: 'notes' })
  return actions
}

export default function AIPage() {
  const lang = useLang()
  const { navigate } = useNavigation()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [userName, setUserName] = useState('')
  const [hoveredConv, setHoveredConv] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    getUser().then(u => { if (u?.name) setUserName(u.name) })
    fetchConversations()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const fetchConversations = async () => {
    try {
      const r = await fetch('/api/ai/conversations')
      if (r.ok) {
        const data = await r.json()
        setConversations(data.conversations ?? [])
      }
    } catch { /* silent */ }
  }

  const loadConversation = async (id: string) => {
    setActiveConversationId(id)
    setMessages([])
    if (isMobile) setShowSidebar(false)
    try {
      const r = await fetch(`/api/ai/conversations/${id}`)
      if (r.ok) {
        const data = await r.json()
        const msgs: Message[] = (data.messages ?? []).map((m: { role: string; content: string; created_at: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
        }))
        setMessages(msgs)
      }
    } catch { /* silent */ }
  }

  const startNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    if (isMobile) setShowSidebar(false)
  }

  const sendText = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId: activeConversationId,
        }),
      })
      const data = await r.json()
      if (data.conversationId && !activeConversationId) {
        setActiveConversationId(data.conversationId as string)
        fetchConversations()
      } else if (activeConversationId) {
        fetchConversations()
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content as string,
        timestamp: new Date().toISOString(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'en' ? 'Connection error. Please try again.' : 'Erro ao conectar. Tenta novamente.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    sendText(text)
  }

  const suggestions = lang === 'en'
    ? ['How are my finances?', 'What are my most urgent tasks?', 'Create a workout plan for this week', 'Summarise my recent notes']
    : ['Como estão as minhas finanças?', 'Quais são as minhas tarefas mais urgentes?', 'Cria um plano de treino para esta semana', 'Resume as minhas notas recentes']

  const sidebarVisible = !isMobile || showSidebar

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      {sidebarVisible && (
        <div style={{
          width: 240,
          borderRight: '1px solid var(--edge)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          background: 'var(--bg-void)',
          ...(isMobile ? { position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 20 } : {}),
        }}>
          <div style={{ padding: '16px 12px 12px', borderBottom: '1px solid var(--edge-soft)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--c-task)', marginBottom: 12 }}>
              Braosa AI
            </div>
            <button
              className="btn"
              onClick={startNewChat}
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
            >
              <Icon name="plus" size={13} />
              {lang === 'en' ? 'New Chat' : 'Nova Conversa'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, padding: '24px 12px', fontFamily: 'var(--font-mono)' }}>
                {lang === 'en' ? 'No conversations yet' : 'Sem conversas ainda'}
              </div>
            ) : conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                onMouseEnter={() => setHoveredConv(conv.id)}
                onMouseLeave={() => setHoveredConv(null)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  margin: '0 6px',
                  borderLeft: conv.id === activeConversationId ? '2px solid var(--c-task)' : '2px solid transparent',
                  background: conv.id === activeConversationId
                    ? 'var(--c-task-dim)'
                    : hoveredConv === conv.id ? 'var(--bg-raised-2)' : 'transparent',
                  transition: 'background .15s',
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title || (lang === 'en' ? 'Untitled' : 'Sem título')}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>
                  {relativeTime(conv.updated_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 15, background: 'oklch(0 0 0 / 0.45)' }}
        />
      )}

      {/* ─── Chat area ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--edge)', flexShrink: 0 }}>
          {isMobile && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', padding: 6, borderRadius: 6 }}
            >
              <Icon name="list" size={16} />
            </button>
          )}
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Braosa AI</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="pulse" style={{ width: 7, height: 7, background: '#22c55e', borderRadius: 99, display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>Online</span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={startNewChat}
            title={lang === 'en' ? 'New chat' : 'Nova conversa'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', padding: 6, borderRadius: 6 }}
          >
            <Icon name="edit" size={14} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && !loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '40px 20px', minHeight: '60%' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius)',
                background: 'var(--c-task-dim)', border: '1px solid var(--c-task)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--c-task)',
              }}>
                B
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
                  {lang === 'en' ? `Hey, ${userName || 'there'}! 👋` : `Olá, ${userName || 'aí'}! 👋`}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.6, marginTop: 6, maxWidth: 340 }}>
                  {lang === 'en'
                    ? "I'm Braosa, your personal assistant. I have access to everything in your OS."
                    : 'Sou o Braosa, o teu assistente pessoal. Tenho acesso a tudo no teu OS.'}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 420 }}>
                {suggestions.map((s, i) => (
                  <button key={i} className="btn" onClick={() => sendText(s)} style={{ fontSize: 12.5, padding: '7px 13px' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const actions = msg.role === 'assistant' ? detectActions(msg.content, lang) : []
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={msg.role === 'user' ? {
                      marginLeft: 'auto',
                      maxWidth: '72%',
                      background: 'var(--c-task-dim)',
                      border: '1px solid color-mix(in oklch, var(--c-task) 30%, transparent)',
                      borderRadius: '14px 14px 4px 14px',
                      padding: '11px 15px',
                      fontSize: 13.5,
                      color: 'var(--ink)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    } : {
                      marginRight: 'auto',
                      maxWidth: '76%',
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--edge)',
                      borderRadius: '14px 14px 14px 4px',
                      padding: '13px 17px',
                      fontSize: 13.5,
                      color: 'var(--ink-soft)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                      {formatTime(msg.timestamp)}
                    </div>
                    {actions.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {actions.map((action, ai) => (
                          <button
                            key={ai}
                            className="btn"
                            onClick={() => navigate(action.target)}
                            style={{ fontSize: 11, padding: '5px 10px', color: 'var(--c-task)' }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: '14px 14px 14px 4px', padding: '13px 17px' }}>
                    <span style={{ display: 'inline-flex', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: 99,
                          background: 'var(--ink-faint)', display: 'inline-block',
                          animation: 'pulse 1.2s ease-in-out infinite',
                          animationDelay: `${i * 0.18}s`,
                        }} />
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
        <div style={{ borderTop: '1px solid var(--edge-soft)', padding: '12px 18px', flexShrink: 0 }}>
          {input.length > 200 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', textAlign: 'right', marginBottom: 4 }}>
              {input.length} chars
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder={lang === 'en' ? 'Message Braosa…' : 'Mensagem ao Braosa…'}
              className="glow-focus"
              style={{
                flex: 1,
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
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40,
                background: 'var(--c-task-dim)',
                border: '1px solid var(--c-task)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || loading ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              <Icon name="send" size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

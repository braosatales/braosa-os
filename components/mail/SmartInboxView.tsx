'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { relativeTime } from '@/lib/date'
import { parseEmailAddress } from '@/lib/mail'

type CategorisedThread = {
  threadId: string
  category: 'action_needed' | 'waiting' | 'fyi' | 'invoice' | 'newsletter' | 'spam'
  urgency: 'high' | 'medium' | 'low'
  reason: string
  subject?: string
  from?: string
  date?: string
  snippet?: string
}

type SmartData = {
  categorised: CategorisedThread[]
  urgent: string[]
  invoices: string[]
  generatedAt: string
}

type Props = {
  onSelectThreadId: (id: string) => void
  selectedId?: string | null
}

function ThreadRow({
  thread,
  badge,
  badgeColor,
  onClick,
  selected,
}: {
  thread: CategorisedThread
  badge: string
  badgeColor: string
  onClick: () => void
  selected?: boolean
}) {
  const sender = thread.from ? parseEmailAddress(thread.from) : null
  const initials = sender?.name
    ? sender.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : (sender?.email?.slice(0, 2).toUpperCase() ?? '??')

  return (
    <div
      onClick={onClick}
      className="task-row"
      style={{
        display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
        borderRadius: 8, margin: '0 0 2px', minHeight: 64,
        background: selected ? 'color-mix(in oklab, var(--c-task) 10%, transparent)' : 'transparent',
        borderLeft: selected ? '3px solid var(--c-task)' : '3px solid transparent',
        transition: 'background .12s',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'color-mix(in oklab, var(--c-mail) 18%, var(--bg-raised-2))',
        border: '1px solid color-mix(in oklab, var(--c-mail) 28%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: 'var(--c-mail)', userSelect: 'none',
      }}>
        {initials}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {sender?.name ?? sender?.email ?? L('Desconhecido', 'Unknown')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {thread.date ? relativeTime(thread.date) : ''}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {thread.subject || L('(sem assunto)', '(no subject)')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {thread.reason}
        </div>
      </div>

      {/* Badge */}
      <span style={{
        flexShrink: 0, alignSelf: 'center',
        fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
        background: `color-mix(in oklab, ${badgeColor} 15%, transparent)`,
        color: badgeColor,
        border: `1px solid color-mix(in oklab, ${badgeColor} 30%, transparent)`,
        padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap',
      }}>
        {badge}
      </span>
    </div>
  )
}

function Section({
  title,
  count,
  collapsed: initCollapsed = false,
  children,
  toggleLabel,
}: {
  title: string
  count: number
  collapsed?: boolean
  children: React.ReactNode
  toggleLabel?: string
}) {
  const [open, setOpen] = useState(!initCollapsed)

  if (count === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: initCollapsed ? 'pointer' : 'default' }}
        onClick={initCollapsed ? () => setOpen(o => !o) : undefined}
      >
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {title}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)', padding: '1px 6px', borderRadius: 99 }}>
          {count}
        </span>
        {initCollapsed && (
          <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <Icon name="chevron-down" size={14} />
          </span>
        )}
      </div>
      {open && <div style={{ background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--edge-soft)', overflow: 'hidden' }}>{children}</div>}
      {initCollapsed && !open && (
        <button
          className="btn"
          onClick={() => setOpen(true)}
          style={{ fontSize: 12, padding: '5px 14px', width: '100%', justifyContent: 'center' }}
        >
          {toggleLabel ?? `${L('Ver', 'View')} ${count}`}
        </button>
      )}
    </div>
  )
}

export default function SmartInboxView({ onSelectThreadId, selectedId }: Props) {
  const lang = useLang()
  const [data, setData] = useState<SmartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/mail/smart-inbox${refresh ? '?refresh=true' : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 68, borderRadius: 10, background: 'var(--bg-raised)', animation: 'skeleton-pulse 1.2s ease-in-out alternate infinite', opacity: 0.6 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--neg)', marginBottom: 12 }}>{error}</p>
        <button className="btn" onClick={() => fetchData(true)} style={{ fontSize: 12 }}>
          <Icon name="refresh" size={13} />
          {L('Tentar novamente', 'Try again')}
        </button>
      </div>
    )
  }

  if (!data) return null

  const { categorised, generatedAt } = data

  const actionNeeded = categorised.filter(t => t.category === 'action_needed' && (t.urgency === 'high' || t.urgency === 'medium'))
  const actionLow = categorised.filter(t => t.category === 'action_needed' && t.urgency === 'low')
  const waiting = categorised.filter(t => t.category === 'waiting')
  const invoices = categorised.filter(t => t.category === 'invoice')
  const fyi = categorised.filter(t => t.category === 'fyi')
  const newsletters = categorised.filter(t => t.category === 'newsletter')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <span style={{ color: 'var(--c-task)' }}><Icon name="wand" size={18} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
          {lang === 'pt' ? 'Caixa Inteligente' : 'Smart Inbox'}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginLeft: 4 }}>
          {L('Gerado', 'Generated')} {relativeTime(generatedAt)}
        </span>
        <button
          className="btn"
          onClick={() => fetchData(true)}
          style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 12px' }}
        >
          <Icon name="refresh" size={12} />
          {L('Atualizar', 'Refresh')}
        </button>
      </div>

      {/* Needs Your Attention */}
      <Section
        title={lang === 'pt' ? 'Precisa da Sua Atenção' : 'Needs Your Attention'}
        count={actionNeeded.length + actionLow.length}
      >
        {[...actionNeeded, ...actionLow].map(t => (
          <ThreadRow
            key={t.threadId}
            thread={t}
            badge={t.urgency === 'high' ? (lang === 'pt' ? 'URGENTE' : 'URGENT') : (lang === 'pt' ? 'RESPONDER' : 'REPLY')}
            badgeColor={t.urgency === 'high' ? 'var(--neg)' : 'var(--c-fin)'}
            onClick={() => onSelectThreadId(t.threadId)}
            selected={selectedId === t.threadId}
          />
        ))}
      </Section>

      {/* Waiting For */}
      <Section
        title={lang === 'pt' ? 'A Aguardar' : 'Waiting For'}
        count={waiting.length}
      >
        {waiting.map(t => (
          <ThreadRow
            key={t.threadId}
            thread={t}
            badge={lang === 'pt' ? 'AGUARDA' : 'WAITING'}
            badgeColor="var(--c-cal)"
            onClick={() => onSelectThreadId(t.threadId)}
            selected={selectedId === t.threadId}
          />
        ))}
      </Section>

      {/* Invoices to Scan */}
      <Section
        title={lang === 'pt' ? 'Faturas para Digitalizar' : 'Invoices to Scan'}
        count={invoices.length}
      >
        {invoices.map(t => (
          <div key={t.threadId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <ThreadRow
                thread={t}
                badge={lang === 'pt' ? 'FATURA' : 'INVOICE'}
                badgeColor="var(--c-fin)"
                onClick={() => onSelectThreadId(t.threadId)}
                selected={selectedId === t.threadId}
              />
            </div>
            <button
              className="btn"
              onClick={e => { e.stopPropagation(); onSelectThreadId(t.threadId) }}
              style={{ fontSize: 11, padding: '5px 10px', marginRight: 8, flexShrink: 0, color: 'var(--c-fin)' }}
              title={lang === 'pt' ? 'Digitalizar fatura' : 'Scan invoice'}
            >
              <Icon name="camera" size={12} />
              {lang === 'pt' ? 'Digitalizar' : 'Scan'}
            </button>
          </div>
        ))}
      </Section>

      {/* FYI — collapsed by default */}
      <Section
        title="FYI"
        count={fyi.length}
        collapsed
        toggleLabel={`${L('Ver', 'View')} ${fyi.length} ${lang === 'pt' ? 'informativos' : 'FYI'}`}
      >
        {fyi.map(t => (
          <ThreadRow
            key={t.threadId}
            thread={t}
            badge="FYI"
            badgeColor="var(--ink-faint)"
            onClick={() => onSelectThreadId(t.threadId)}
            selected={selectedId === t.threadId}
          />
        ))}
      </Section>

      {/* Newsletters — collapsed by default */}
      <Section
        title="Newsletters"
        count={newsletters.length}
        collapsed
        toggleLabel={`${L('Ver', 'View')} ${newsletters.length} newsletters`}
      >
        {newsletters.map(t => (
          <ThreadRow
            key={t.threadId}
            thread={t}
            badge="NL"
            badgeColor="var(--c-dash)"
            onClick={() => onSelectThreadId(t.threadId)}
            selected={selectedId === t.threadId}
          />
        ))}
      </Section>

      {categorised.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span style={{ color: 'var(--ink-faint)' }}><Icon name="inbox" size={36} /></span>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-faint)' }}>
            {L('Caixa de entrada vazia', 'Inbox is empty')}
          </p>
        </div>
      )}
    </div>
  )
}

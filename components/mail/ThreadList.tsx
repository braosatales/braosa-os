'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui'
import { relativeTime } from '@/lib/date'
import { L, useLang } from '@/lib/i18n'
import type { MailThread } from '@/lib/mail'

type Props = {
  folder: string
  search: string
  onSelect: (thread: MailThread) => void
  selectedId: string | null
  onExtractContact?: (messageId: string, threadId: string) => void
  extractedContacts?: Set<string>
}

function SenderAvatar({ name, email, size = 36 }: { name: string | null; email: string; size?: number }) {
  const initials = name
    ? name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'color-mix(in oklab, var(--c-mail) 18%, var(--bg-raised-2))',
      border: '1px solid color-mix(in oklab, var(--c-mail) 28%, transparent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, color: 'var(--c-mail)',
      userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

export default function ThreadList({
  folder,
  search,
  onSelect,
  selectedId,
  onExtractContact,
  extractedContacts = new Set(),
}: Props) {
  useLang()
  const [threads, setThreads] = useState<MailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchThreads = useCallback(async (pageToken?: string) => {
    if (!pageToken) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({ folder })
      if (search) params.set('search', search)
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`/api/mail/threads?${params}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      if (pageToken) {
        setThreads(prev => [...prev, ...(data.threads ?? [])])
      } else {
        setThreads(data.threads ?? [])
      }
      setNextPageToken(data.nextPageToken ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [folder, search])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  if (loading) {
    return (
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            height: 64, borderRadius: 8,
            background: 'var(--bg-raised)', opacity: 0.5,
            animation: 'skeleton-pulse 1.2s ease-in-out alternate infinite',
          }} />
        ))}
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, flexDirection: 'column', gap: 12,
      }}>
        <span style={{ color: 'var(--ink-faint)' }}><Icon name="inbox" size={32} /></span>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center' }}>
          {search ? L('Sem resultados', 'No results') : L('Sem mensagens', 'No messages')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="hide-scrollbar" style={{ flex: 1, overflow: 'auto' }}>
        {threads.map(thread => {
          const isSelected = thread.id === selectedId
          const isUnread = !thread.read
          const sender = thread.participants[0]
          const firstMsg = thread.messages[0]
          const alreadyExtracted = firstMsg && extractedContacts.has(firstMsg.id)

          return (
            <div
              key={thread.id}
              onClick={() => onSelect(thread)}
              style={{
                display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer',
                borderRadius: 8, margin: '0 6px 2px',
                background: isSelected
                  ? 'color-mix(in oklab, var(--c-mail) 10%, transparent)'
                  : isUnread
                  ? 'color-mix(in oklab, var(--c-mail) 6%, transparent)'
                  : 'transparent',
                borderLeft: isSelected
                  ? '3px solid var(--c-mail)'
                  : isUnread
                  ? '3px solid var(--c-mail)'
                  : '3px solid transparent',
                transition: 'background .12s',
                position: 'relative',
              }}
              className="task-row"
            >
              {/* Avatar + extract button */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <SenderAvatar name={sender?.name ?? null} email={sender?.email ?? ''} />
                {onExtractContact && firstMsg && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onExtractContact(firstMsg.id, thread.id)
                    }}
                    title={L('Extrair contacto', 'Extract contact')}
                    style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: alreadyExtracted ? 'var(--c-cal)' : 'var(--c-mail)',
                      border: '1.5px solid var(--bg-base)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0,
                      opacity: 0.9,
                    }}
                  >
                    {alreadyExtracted
                      ? <Icon name="check" size={8} />
                      : <Icon name="plus" size={8} />}
                  </button>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 13, fontWeight: isUnread ? 600 : 400,
                    color: isUnread ? 'var(--ink)' : 'var(--ink-soft)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {sender?.name ?? sender?.email ?? ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {relativeTime(thread.lastDate)}
                  </span>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: isUnread ? 600 : 400,
                  color: isUnread ? 'var(--ink)' : 'var(--ink-dim)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 2,
                }}>
                  {thread.subject || L('(sem assunto)', '(no subject)')}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--ink-faint)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {thread.snippet}
                </div>
              </div>

              {/* Right badges */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, justifyContent: 'center' }}>
                {thread.starred && (
                  <span style={{ color: 'var(--c-fin)' }}><Icon name="star-fill" size={13} /></span>
                )}
                {thread.messages.some(m => m.hasAttachments) && (
                  <span style={{ color: 'var(--ink-faint)' }}><Icon name="file" size={13} /></span>
                )}
                {thread.messageCount > 1 && (
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-raised-2)', color: 'var(--ink-faint)',
                    padding: '1px 5px', borderRadius: 99,
                    border: '1px solid var(--edge-soft)',
                  }}>
                    {thread.messageCount}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {nextPageToken && (
          <div style={{ padding: '12px 16px', textAlign: 'center' }}>
            <button
              className="btn"
              onClick={() => fetchThreads(nextPageToken)}
              disabled={loadingMore}
              style={{ fontSize: 12, padding: '6px 16px' }}
            >
              {loadingMore ? '...' : L('Carregar mais', 'Load more')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

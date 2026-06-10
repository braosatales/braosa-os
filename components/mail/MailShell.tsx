'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { MAIL_FOLDERS, type MailThread } from '@/lib/mail'
import ThreadList from './ThreadList'
import ThreadDetail from './ThreadDetail'
import ComposeModal from './ComposeModal'

type GmailLabel = {
  id: string
  name: string
  unreadCount: number
  totalCount: number
}

export default function MailShell() {
  const lang = useLang()
  const isMobile = useIsMobile()
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [extractedContacts, setExtractedContacts] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch Gmail labels for unread counts and custom labels
  useEffect(() => {
    fetch('/api/mail/labels')
      .then(r => r.json())
      .then(d => {
        const labels: GmailLabel[] = d.labels ?? []
        setGmailLabels(labels)
        const counts: Record<string, number> = {}
        const labelMap: Record<string, string> = {
          INBOX: 'inbox', STARRED: 'starred', SENT: 'sent',
          DRAFT: 'drafts', IMPORTANT: 'important', TRASH: 'trash',
        }
        for (const label of labels) {
          const folder = labelMap[label.id]
          if (folder && label.unreadCount > 0) counts[folder] = label.unreadCount
        }
        setUnreadCounts(counts)
      })
      .catch(() => {})
  }, [refreshKey])

  const customLabels = gmailLabels.filter(l =>
    !['INBOX', 'STARRED', 'SENT', 'DRAFT', 'IMPORTANT', 'TRASH', 'SPAM',
      'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
      'CATEGORY_PERSONAL', 'UNREAD', 'IMPORTANT'].includes(l.id)
    && l.name
  )

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      setSearch(searchInput)
      setSelectedThreadId(null)
    }
  }

  function handleSelectThread(thread: MailThread) {
    setSelectedThreadId(thread.id)
    // Mark as read via PATCH
    if (!thread.read) {
      fetch(`/api/mail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabels: ['UNREAD'] }),
      }).catch(() => {})
    }
  }

  const handleExtractContact = useCallback(async (messageId: string, threadId: string) => {
    try {
      await fetch('/api/mail/extract-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      setExtractedContacts(prev => new Set([...prev, messageId]))
    } catch {
      // silent
    }
  }, [])

  const sidebar = (
    <div
      className="fin-sidebar"
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--edge-soft)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Compose button */}
      <div style={{ padding: '14px 12px 10px' }}>
        <button
          className="btn btn-accent"
          onClick={() => setComposeOpen(true)}
          style={{
            width: '100%', justifyContent: 'center',
            fontSize: 13, padding: '9px 14px',
            '--accent': 'var(--c-mail)',
          } as any}
        >
          <Icon name="edit" size={13} />
          <span className="subnav-label">{L('+ Escrever', '+ Compose')}</span>
        </button>
      </div>

      {/* Standard folders */}
      <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
        <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {MAIL_FOLDERS.map(folder => {
            const active = activeFolder === folder.id
            const unread = unreadCounts[folder.id] ?? 0
            return (
              <button
                key={folder.id}
                onClick={() => { setActiveFolder(folder.id); setSearch(''); setSearchInput(''); setSelectedThreadId(null) }}
                className="subnav-item"
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: active ? `color-mix(in oklab, ${folder.color} 12%, transparent)` : 'transparent',
                  border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  borderLeft: active ? `2px solid ${folder.color}` : '2px solid transparent',
                  color: active ? folder.color : 'var(--ink-dim)',
                  transition: 'background .12s',
                  justifyContent: 'flex-start',
                }}
              >
                <span style={{ color: active ? folder.color : 'var(--ink-faint)', flexShrink: 0 }}>
                  <Icon name={folder.glyph as any} size={14} />
                </span>
                <span className="subnav-label" style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400 }}>
                  {lang === 'pt' ? folder.label_pt : folder.label_en}
                </span>
                {unread > 0 && (
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                    background: 'color-mix(in oklab, var(--c-fin) 20%, transparent)',
                    color: 'var(--c-fin)',
                    padding: '1px 6px', borderRadius: 99,
                    border: '1px solid color-mix(in oklab, var(--c-fin) 30%, transparent)',
                  }}>
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }}>
              <Icon name="search" size={13} />
            </span>
            <input
              className="glow-focus"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={L('Pesquisar email...', 'Search mail...')}
              style={{
                width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 12,
                padding: '7px 10px 7px 30px', outline: 'none',
                '--accent': 'var(--c-mail)',
              } as any}
            />
          </div>
        </div>

        {/* Custom Gmail labels */}
        {customLabels.length > 0 && (
          <div style={{ padding: '6px 12px 4px' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 6 }}>
              <span className="subnav-label">{L('ETIQUETAS', 'LABELS')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {customLabels.slice(0, 12).map(label => {
                const active = activeFolder === label.id
                return (
                  <button
                    key={label.id}
                    onClick={() => { setActiveFolder(label.id); setSearch(''); setSearchInput(''); setSelectedThreadId(null) }}
                    className="subnav-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                      background: active ? 'var(--bg-raised-2)' : 'transparent',
                      border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                      color: active ? 'var(--ink)' : 'var(--ink-dim)',
                      transition: 'background .12s',
                    }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--c-mail)',
                    }} />
                    <span className="subnav-label" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {label.name}
                    </span>
                    {label.unreadCount > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                        {label.unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {!isMobile && sidebar}

      {/* Thread list */}
      <div style={{
        width: isMobile ? '100%' : 340,
        minWidth: isMobile ? undefined : 280,
        flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--edge-soft)',
        display: isMobile && selectedThreadId ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* List header */}
        <div style={{
          padding: '12px 14px 8px',
          borderBottom: '1px solid var(--edge-soft)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {search
              ? L(`"${search}"`, `"${search}"`)
              : (lang === 'pt'
                ? MAIL_FOLDERS.find(f => f.id === activeFolder)?.label_pt
                : MAIL_FOLDERS.find(f => f.id === activeFolder)?.label_en)
                ?? activeFolder}
          </span>
          {isMobile && (
            <button
              className="btn btn-accent"
              onClick={() => setComposeOpen(true)}
              style={{ fontSize: 12, padding: '6px 12px', '--accent': 'var(--c-mail)' } as any}
            >
              <Icon name="edit" size={12} />
              {L('Escrever', 'Compose')}
            </button>
          )}
        </div>

        <ThreadList
          key={`${activeFolder}-${search}-${refreshKey}`}
          folder={activeFolder}
          search={search}
          onSelect={handleSelectThread}
          selectedId={selectedThreadId}
          onExtractContact={handleExtractContact}
          extractedContacts={extractedContacts}
        />
      </div>

      {/* Thread detail */}
      {!isMobile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedThreadId ? (
            <ThreadDetail
              key={selectedThreadId}
              threadId={selectedThreadId}
              onClose={() => setSelectedThreadId(null)}
              onAction={() => setRefreshKey(k => k + 1)}
            />
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12,
            }}>
              <span style={{ color: 'var(--ink-faint)' }}><Icon name="mail" size={36} /></span>
              <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                {L('Seleciona um email', 'Select an email')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mobile: thread detail as modal */}
      {isMobile && selectedThreadId && (
        <ThreadDetail
          key={selectedThreadId}
          threadId={selectedThreadId}
          onClose={() => setSelectedThreadId(null)}
          onAction={() => setRefreshKey(k => k + 1)}
        />
      )}

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
      />
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { Icon } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { MobileSubTabContext } from '@/lib/mobile-context'
import { MAIL_FOLDERS, type MailThread } from '@/lib/mail'
import ThreadList from './ThreadList'
import ThreadDetail from './ThreadDetail'
import ComposeModal from './ComposeModal'
import SmartInboxView from './SmartInboxView'
import LabelsPanel from './LabelsPanel'
import FiltersPanel from './FiltersPanel'

type GmailLabel = {
  id: string
  name: string
  unreadCount: number
  totalCount: number
}

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang()
  if (!open) return null
  const shortcuts = [
    { key: 'C', action: L('Escrever email', 'Compose email') },
    { key: 'R', action: L('Responder', 'Reply') },
    { key: 'E', action: L('Arquivar', 'Archive') },
    { key: 'S', action: L('Favorito / Desfavorito', 'Star / Unstar') },
    { key: '#', action: L('Mover para o lixo', 'Move to trash') },
    { key: 'U', action: L('Marcar como não lido', 'Mark as unread') },
    { key: '?', action: L('Mostrar atalhos', 'Show shortcuts') },
    { key: 'Esc', action: L('Fechar', 'Close') },
  ]
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'oklch(0 0 0 / 0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius-lg)', padding: 24, width: 360, boxShadow: 'var(--shadow-pop)', animation: 'pop-in .22s ease both' }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>
          {L('Atalhos de Teclado', 'Keyboard Shortcuts')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
          {shortcuts.map(s => (
            <>
              <kbd key={`key-${s.key}`} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 28, padding: '2px 7px', borderRadius: 6,
                background: 'var(--bg-raised-2)', border: '1px solid var(--edge-strong)',
                fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-soft)',
                boxShadow: '0 2px 0 var(--edge-strong)',
              }}>
                {s.key}
              </kbd>
              <span key={`action-${s.key}`} style={{ fontSize: 13, color: 'var(--ink-dim)', alignSelf: 'center' }}>
                {s.action}
              </span>
            </>
          ))}
        </div>
        <button
          className="btn"
          onClick={onClose}
          style={{ marginTop: 16, width: '100%', justifyContent: 'center', fontSize: 13 }}
        >
          {L('Fechar', 'Close')}
        </button>
      </div>
    </div>
  )
}

export default function MailShell() {
  const lang = useLang()
  const isMobile = useIsMobile()
  const { activeSubTab: mobileSubTab, setSubTab: setMobileSubTab } = useContext(MobileSubTabContext)

  const [activeFolder, setActiveFolder] = useState('smart')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThreadStarred, setSelectedThreadStarred] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [extractedContacts, setExtractedContacts] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)

  const prevMobileSubTab = useRef(mobileSubTab)

  // Sync mobile tab changes to internal folder state + clear selection
  useEffect(() => {
    if (isMobile && mobileSubTab && mobileSubTab !== prevMobileSubTab.current) {
      prevMobileSubTab.current = mobileSubTab
      setActiveFolder(mobileSubTab)
      setSearch('')
      setSearchInput('')
      setSelectedThreadId(null)
    }
  }, [isMobile, mobileSubTab])

  const currentFolder = isMobile ? mobileSubTab || 'smart' : activeFolder

  const fetchLabels = useCallback(() => {
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
  }, [])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels, refreshKey])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) return

      switch (e.key) {
        case 'c':
        case 'C':
          e.preventDefault()
          setComposeOpen(true)
          break
        case 'r':
        case 'R':
          if (selectedThreadId) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('braosa:mail:focus-reply'))
          }
          break
        case 'e':
        case 'E':
          if (selectedThreadId) {
            e.preventDefault()
            fetch(`/api/mail/threads/${selectedThreadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ removeLabels: ['INBOX'] }),
            }).catch(() => {})
            setSelectedThreadId(null)
            setRefreshKey(k => k + 1)
          }
          break
        case 's':
        case 'S':
          if (selectedThreadId) {
            e.preventDefault()
            const body = selectedThreadStarred
              ? { removeLabels: ['STARRED'] }
              : { addLabels: ['STARRED'] }
            fetch(`/api/mail/threads/${selectedThreadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }).catch(() => {})
            setSelectedThreadStarred(s => !s)
          }
          break
        case '#':
          if (selectedThreadId) {
            e.preventDefault()
            fetch(`/api/mail/threads/${selectedThreadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addLabels: ['TRASH'], removeLabels: ['INBOX'] }),
            }).catch(() => {})
            setSelectedThreadId(null)
            setRefreshKey(k => k + 1)
          }
          break
        case 'u':
        case 'U':
          if (selectedThreadId) {
            e.preventDefault()
            fetch(`/api/mail/threads/${selectedThreadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addLabels: ['UNREAD'] }),
            }).catch(() => {})
          }
          break
        case '?':
          e.preventDefault()
          setShortcutsOpen(true)
          break
        case 'Escape':
          if (shortcutsOpen) { setShortcutsOpen(false); break }
          if (composeOpen) { setComposeOpen(false); break }
          if (labelsOpen) { setLabelsOpen(false); break }
          if (filtersOpen) { setFiltersOpen(false); break }
          if (selectedThreadId) setSelectedThreadId(null)
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedThreadId, selectedThreadStarred, composeOpen, labelsOpen, filtersOpen, shortcutsOpen])

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
    setSelectedThreadStarred(thread.starred)
    if (!thread.read) {
      fetch(`/api/mail/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabels: ['UNREAD'] }),
      }).catch(() => {})
    }
  }

  function handleSelectThreadId(id: string) {
    setSelectedThreadId(id)
    setSelectedThreadStarred(false)
  }

  const handleExtractContact = useCallback(async (messageId: string) => {
    try {
      await fetch('/api/mail/extract-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      setExtractedContacts(prev => new Set([...prev, messageId]))
    } catch { /* silent */ }
  }, [])

  function switchFolder(id: string) {
    if (isMobile) setMobileSubTab(id)
    else setActiveFolder(id)
    setSearch('')
    setSearchInput('')
    setSelectedThreadId(null)
  }

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
          <span className="subnav-label" style={{ marginLeft: 'auto', opacity: 0.55, fontSize: 9, fontFamily: 'var(--font-mono)', background: 'oklch(0 0 0 / 0.2)', padding: '1px 4px', borderRadius: 3 }}>C</span>
        </button>
      </div>

      {/* Standard folders */}
      <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
        <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {MAIL_FOLDERS.map(folder => {
            const active = currentFolder === folder.id
            const unread = unreadCounts[folder.id] ?? 0
            return (
              <button
                key={folder.id}
                onClick={() => switchFolder(folder.id)}
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
                const active = currentFolder === label.id
                return (
                  <button
                    key={label.id}
                    onClick={() => switchFolder(label.id)}
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
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: 'var(--c-mail)' }} />
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

      {/* Sidebar footer */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--edge-soft)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={() => setFiltersOpen(true)}
          className="subnav-item"
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
            borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none',
            cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--ink-dim)',
          }}
        >
          <span style={{ color: 'var(--ink-faint)', flexShrink: 0 }}><Icon name="filter" size={13} /></span>
          <span className="subnav-label" style={{ fontSize: 12.5 }}>{L('Filtros', 'Filters')}</span>
        </button>
        <button
          onClick={() => setLabelsOpen(true)}
          className="subnav-item"
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
            borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none',
            cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--ink-dim)',
          }}
        >
          <span style={{ color: 'var(--ink-faint)', flexShrink: 0 }}><Icon name="tag" size={13} /></span>
          <span className="subnav-label" style={{ fontSize: 12.5 }}>{L('Gerir Etiquetas', 'Manage Labels')}</span>
        </button>
      </div>
    </div>
  )

  const threadDetail = selectedThreadId ? (
    <ThreadDetail
      key={selectedThreadId}
      threadId={selectedThreadId}
      onClose={() => setSelectedThreadId(null)}
      onAction={() => setRefreshKey(k => k + 1)}
    />
  ) : null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {!isMobile && sidebar}

      {/* === SMART INBOX === */}
      {currentFolder === 'smart' ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {!(isMobile && selectedThreadId) && (
            <div style={{ flex: 1, overflow: 'auto' }} className="hide-scrollbar">
              <SmartInboxView
                onSelectThreadId={handleSelectThreadId}
                selectedId={selectedThreadId}
              />
            </div>
          )}

          {!isMobile && selectedThreadId && (
            <div style={{
              width: 520, flexShrink: 0,
              borderLeft: '1px solid var(--edge-soft)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {threadDetail}
            </div>
          )}

          {isMobile && selectedThreadId && threadDetail}
        </div>
      ) : (
        /* === REGULAR INBOX === */
        <>
          <div style={{
            width: isMobile ? '100%' : 340,
            minWidth: isMobile ? undefined : 280,
            flexShrink: 0,
            borderRight: isMobile ? 'none' : '1px solid var(--edge-soft)',
            display: isMobile && selectedThreadId ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 14px 8px',
              borderBottom: '1px solid var(--edge-soft)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {search
                  ? `"${search}"`
                  : (lang === 'pt'
                    ? MAIL_FOLDERS.find(f => f.id === currentFolder)?.label_pt
                    : MAIL_FOLDERS.find(f => f.id === currentFolder)?.label_en)
                    ?? currentFolder}
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
              key={`${currentFolder}-${search}-${refreshKey}`}
              folder={currentFolder}
              search={search}
              onSelect={handleSelectThread}
              selectedId={selectedThreadId}
              onExtractContact={handleExtractContact}
              extractedContacts={extractedContacts}
            />
          </div>

          {/* Thread detail — desktop */}
          {!isMobile && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {selectedThreadId ? (
                threadDetail
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                  <span style={{ color: 'var(--ink-faint)' }}><Icon name="mail" size={36} /></span>
                  <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                    {L('Seleciona um email', 'Select an email')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Thread detail — mobile full screen */}
          {isMobile && selectedThreadId && threadDetail}
        </>
      )}

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
      <LabelsPanel open={labelsOpen} onClose={() => setLabelsOpen(false)} onRefresh={fetchLabels} />
      <FiltersPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

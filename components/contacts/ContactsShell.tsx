'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon, EmptyState, Modal } from '@/components/ui'
import { useContactStore, ContactStore } from '@/lib/contact-store'
import {
  getContactDisplayName,
  getContactInitials,
  TAG_META,
  type Contact,
  type ContactInteraction,
} from '@/lib/contacts'
import { L, useLang } from '@/lib/i18n'
import { relativeTime } from '@/lib/date'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import AddContactModal from './AddContactModal'
import EditContactModal from './EditContactModal'
import PendingReviewPanel from './PendingReviewPanel'

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ contact, size = 38 }: { contact: Contact; size?: number }) {
  const initials = getContactInitials(contact)
  const color = contact.tags[0] ? TAG_META[contact.tags[0]]?.color ?? 'var(--c-contacts)' : 'var(--c-contacts)'

  if (contact.photo_url) {
    return (
      <img
        src={contact.photo_url}
        alt={initials}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `color-mix(in oklab, ${color} 18%, var(--bg-raised-2))`,
      border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, color,
    }}>
      {initials || '?'}
    </div>
  )
}

// ─── Interaction icons ────────────────────────────────────────────────────────

const INTERACTION_META = {
  email:   { icon: 'mail' as const,     color: 'var(--c-mail)' },
  call:    { icon: 'activity' as const, color: 'var(--c-health)' },
  meeting: { icon: 'cal' as const,      color: 'var(--c-cal)' },
  note:    { icon: 'note' as const,     color: 'var(--c-notes)' },
}

// ─── ContactDetail ────────────────────────────────────────────────────────────

function ContactDetail({
  contact,
  onEdit,
  onClose,
}: {
  contact: Contact
  onEdit: () => void
  onClose: () => void
}) {
  useLang()
  const isMobile = useIsMobile()
  const [interactions, setInteractions] = useState<ContactInteraction[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [logType, setLogType] = useState<'email' | 'call' | 'meeting' | 'note'>('note')
  const [logSummary, setLogSummary] = useState('')
  const [logDate, setLogDate] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [notesValue, setNotesValue] = useState(contact.notes ?? '')
  const notesSavedRef = useRef(contact.notes ?? '')

  useEffect(() => {
    setNotesValue(contact.notes ?? '')
    notesSavedRef.current = contact.notes ?? ''
  }, [contact.id, contact.notes])

  useEffect(() => {
    fetch(`/api/contacts/${contact.id}/interactions`)
      .then(r => r.json())
      .then(d => setInteractions(d.interactions ?? []))
      .catch(() => {})
  }, [contact.id])

  const saveNotes = useCallback(() => {
    if (notesValue === notesSavedRef.current) return
    notesSavedRef.current = notesValue
    ContactStore.updateContact(contact.id, { notes: notesValue })
  }, [contact.id, notesValue])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    setLogSaving(true)
    try {
      const r = await fetch(`/api/contacts/${contact.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: logType, summary: logSummary || null, date: logDate || undefined }),
      })
      if (r.ok) {
        const d = await r.json()
        setInteractions(prev => [d.interaction, ...prev])
        ContactStore.updateContact(contact.id, { last_contacted_at: d.interaction.date })
        setLogOpen(false)
        setLogSummary('')
        setLogDate('')
      }
    } finally {
      setLogSaving(false)
    }
  }

  const display = getContactDisplayName(contact)

  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '20px 20px 16px' : '20px 24px 16px',
        borderBottom: '1px solid var(--edge-soft)',
        flexShrink: 0,
      }}>
        {isMobile && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
            <Icon name="chevron-left" size={16} />
          </button>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Avatar contact={contact} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
              {display}
            </div>
            {(contact.job_title || contact.company) && (
              <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 8 }}>
                {[contact.job_title, contact.company].filter(Boolean).join(' · ')}
              </div>
            )}
            {contact.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {contact.tags.map(t => {
                  const meta = TAG_META[t]
                  if (!meta) return null
                  return (
                    <span key={t} style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99,
                      fontSize: 11, fontWeight: 500,
                      background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                      color: meta.color,
                      border: `1px solid color-mix(in oklab, ${meta.color} 22%, transparent)`,
                    }}>
                      {L(meta.label_pt, meta.label_en)}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {contact.email[0] && (
            <a href={`mailto:${contact.email[0]}`} className="btn" style={{ textDecoration: 'none', fontSize: 12.5, padding: '7px 13px' }}>
              <Icon name="mail" size={13} /> {L('Email', 'Email')}
            </a>
          )}
          {contact.phone[0] && (
            <a href={`tel:${contact.phone[0]}`} className="btn" style={{ textDecoration: 'none', fontSize: 12.5, padding: '7px 13px' }}>
              <Icon name="activity" size={13} /> {L('Ligar', 'Call')}
            </a>
          )}
          <button className="btn" onClick={onEdit} style={{ fontSize: 12.5, padding: '7px 13px' }}>
            <Icon name="edit" size={13} /> {L('Editar', 'Edit')}
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px 20px' : '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Contact info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contact.email.map((em, i) => (
            <InfoRow key={`e${i}`} icon="mail" value={em} href={`mailto:${em}`} />
          ))}
          {contact.phone.map((ph, i) => (
            <InfoRow key={`p${i}`} icon="activity" value={ph} href={`tel:${ph}`} />
          ))}
          {contact.address && <InfoRow icon="pin" value={contact.address} />}
          {contact.birthday && (
            <InfoRow icon="calendar" value={new Date(contact.birthday + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
          )}
          {contact.social_links?.linkedin && (
            <InfoRow icon="link" value="LinkedIn" href={contact.social_links.linkedin} />
          )}
          {contact.social_links?.twitter && (
            <InfoRow icon="link" value="Twitter / X" href={contact.social_links.twitter} />
          )}
          {contact.social_links?.instagram && (
            <InfoRow icon="link" value="Instagram" href={contact.social_links.instagram} />
          )}
        </div>

        {/* Notes */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
            {L('NOTAS', 'NOTES')}
          </div>
          <textarea
            className="glow-focus"
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            onBlur={saveNotes}
            placeholder={L('Adiciona notas...', 'Add notes...')}
            style={{
              width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
              padding: '9px 12px', outline: 'none', resize: 'vertical', minHeight: 72,
              '--accent': 'var(--c-contacts)',
            } as any}
          />
        </div>

        {/* Interactions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
              {L('Histórico', 'History')}
            </span>
            <button className="btn" onClick={() => setLogOpen(true)} style={{ fontSize: 11.5, padding: '5px 11px' }}>
              <Icon name="plus" size={11} /> {L('Registar', 'Log')}
            </button>
          </div>

          {/* Log form */}
          {logOpen && (
            <form onSubmit={submitLog} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 12,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select
                  value={logType}
                  onChange={e => setLogType(e.target.value as any)}
                  style={{
                    background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
                    padding: '7px 10px', outline: 'none',
                  }}
                >
                  <option value="note">{L('Nota', 'Note')}</option>
                  <option value="email">Email</option>
                  <option value="call">{L('Chamada', 'Call')}</option>
                  <option value="meeting">{L('Reunião', 'Meeting')}</option>
                </select>
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  style={{
                    background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
                    padding: '7px 10px', outline: 'none', colorScheme: 'dark',
                  }}
                />
              </div>
              <input
                value={logSummary}
                onChange={e => setLogSummary(e.target.value)}
                placeholder={L('Descrição...', 'Description...')}
                style={{
                  background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 13,
                  padding: '7px 10px', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setLogOpen(false)} style={{ fontSize: 12, padding: '6px 12px' }}>
                  {L('Cancelar', 'Cancel')}
                </button>
                <button type="submit" className="btn btn-accent" disabled={logSaving}
                  style={{ fontSize: 12, padding: '6px 12px', '--accent': 'var(--c-contacts)' } as any}>
                  {logSaving ? '...' : L('Guardar', 'Save')}
                </button>
              </div>
            </form>
          )}

          {interactions.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>
              {L('Sem histórico', 'No history yet')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {interactions.map(ix => {
                const meta = INTERACTION_META[ix.type] ?? INTERACTION_META.note
                return (
                  <div key={ix.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: `color-mix(in oklab, ${meta.color} 14%, var(--bg-raised-2))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1, color: meta.color,
                    }}>
                      <Icon name={meta.icon} size={12} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {ix.summary && (
                        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{ix.summary}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                        {relativeTime(ix.date)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Modal open onClose={onClose}>
        <div style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          {inner}
        </div>
      </Modal>
    )
  }

  return inner
}

function InfoRow({ icon, value, href }: { icon: any; value: string; href?: string }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>
        <Icon name={icon} size={13} />
      </span>
      <span style={{ fontSize: 13, color: href ? 'var(--c-contacts)' : 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{content}</a>
  }
  return content
}

// ─── ContactsShell ────────────────────────────────────────────────────────────

export default function ContactsShell() {
  useLang()
  const isMobile = useIsMobile()
  const { contacts, pending, loading } = useContactStore()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'pending'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const selectedContact = contacts.find(c => c.id === selectedId) ?? null

  const filtered = contacts.filter(c => {
    if (activeTag && !c.tags.includes(activeTag)) return false
    if (search) {
      const q = search.toLowerCase()
      const name = getContactDisplayName(c).toLowerCase()
      const co = (c.company ?? '').toLowerCase()
      const em = c.email.join(' ').toLowerCase()
      if (!name.includes(q) && !co.includes(q) && !em.includes(q)) return false
    }
    return true
  })

  async function handleSync() {
    setSyncing(true); setSyncMsg(null)
    try {
      const r = await ContactStore.syncGoogle()
      setSyncMsg(L(`${r.new} novos, ${r.updated} atualizados`, `${r.new} new, ${r.updated} updated`))
      setTimeout(() => setSyncMsg(null), 4000)
    } catch (e: any) {
      setSyncMsg(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const sidebar = (
    <div
      className="fin-sidebar"
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: '1px solid var(--edge-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
      }}
    >
      {/* Label */}
      <div style={{ padding: '14px 16px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-faint)' }}>
        {L('CONTACTOS', 'CONTACTS')}
      </div>

      {/* Search */}
      <div style={{ padding: '0 12px 10px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }}>
          <Icon name="search" size={13} />
        </span>
        <input
          className="glow-focus"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={L('Pesquisar...', 'Search...')}
          style={{
            width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 12.5,
            padding: '7px 10px 7px 30px', outline: 'none',
            '--accent': 'var(--c-contacts)',
          } as any}
        />
      </div>

      {/* Tag filters */}
      <div className="hide-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TagFilterItem
          label={L('Todos', 'All')}
          active={activeTag === null}
          onClick={() => { setActiveTag(null); setView('list') }}
        />
        {Object.entries(TAG_META).map(([key, meta]) => (
          <TagFilterItem
            key={key}
            label={L(meta.label_pt, meta.label_en)}
            color={meta.color}
            active={activeTag === key}
            onClick={() => { setActiveTag(key); setView('list') }}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--edge-soft)' }}>
        <button
          className="btn"
          onClick={handleSync}
          disabled={syncing}
          style={{ fontSize: 11.5, padding: '6px 12px', width: '100%', justifyContent: 'center' }}
        >
          <Icon name="refresh" size={12} />
          {syncing ? L('A sincronizar...', 'Syncing...') : L('Sync Google', 'Sync Google')}
        </button>
        {syncMsg && (
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', lineHeight: 1.4 }}>{syncMsg}</p>
        )}
        {pending.length > 0 && (
          <button
            className="btn"
            onClick={() => setView('pending')}
            style={{
              fontSize: 11.5, padding: '6px 12px', width: '100%', justifyContent: 'space-between',
              color: 'var(--c-fin)', borderColor: 'color-mix(in oklab, var(--c-fin) 30%, transparent)',
            }}
          >
            <span>{L(`${pending.length} para rever`, `${pending.length} to review`)}</span>
            <Icon name="chevron-right" size={12} />
          </button>
        )}
      </div>
    </div>
  )

  const contactList = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* List header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
          {loading
            ? L('A carregar...', 'Loading...')
            : L(`${filtered.length} contacto${filtered.length !== 1 ? 's' : ''}`, `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`)}
        </span>
        <button className="btn" onClick={() => setShowAdd(true)} style={{ fontSize: 12, padding: '5px 11px' }}>
          <Icon name="plus" size={12} /> {L('Novo', 'New')}
        </button>
      </div>

      {/* List */}
      <div className="hide-scrollbar" style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 && !loading ? (
          <EmptyState
            icon="users"
            title={L('Sem contactos', 'No contacts')}
            subtitle={search ? L('Tenta outra pesquisa', 'Try another search') : undefined}
            action={!search ? { label: L('+ Novo Contacto', '+ New Contact'), onClick: () => setShowAdd(true) } : undefined}
          />
        ) : (
          filtered.map(c => {
            const active = c.id === selectedId
            return (
              <div
                key={c.id}
                className="task-row"
                onClick={() => setSelectedId(c.id)}
                style={{
                  display: 'flex', gap: 12, padding: '10px 14px', cursor: 'pointer',
                  borderRadius: 8, margin: '0 6px 2px', minHeight: 56,
                  background: active ? 'color-mix(in oklab, var(--c-contacts) 10%, transparent)' : 'transparent',
                  borderLeft: active ? '2px solid var(--c-contacts)' : '2px solid transparent',
                  transition: 'background .12s',
                }}
              >
                <Avatar contact={c} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getContactDisplayName(c)}
                  </div>
                  {c.company && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.company}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {c.tags.slice(0, 2).map(t => {
                      const meta = TAG_META[t]
                      if (!meta) return null
                      return (
                        <span key={t} style={{
                          display: 'inline-flex', padding: '1px 6px', borderRadius: 99,
                          fontSize: 10, fontWeight: 500,
                          background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                          color: meta.color,
                        }}>
                          {L(meta.label_pt, meta.label_en)}
                        </span>
                      )
                    })}
                  </div>
                  {c.last_contacted_at && (
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                      {relativeTime(c.last_contacted_at)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  if (view === 'pending') {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        {!isMobile && sidebar}
        <PendingReviewPanel pending={pending} onBack={() => setView('list')} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {!isMobile && sidebar}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Contact list panel */}
        <div style={{
          width: isMobile ? '100%' : '40%',
          minWidth: isMobile ? undefined : 260,
          borderRight: isMobile ? 'none' : '1px solid var(--edge-soft)',
          display: isMobile && selectedContact ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}>
          {contactList}
        </div>

        {/* Detail panel */}
        {!isMobile && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {selectedContact ? (
              <ContactDetail
                contact={selectedContact}
                onEdit={() => setEditContact(selectedContact)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>
                  <Icon name="users" size={32} />
                  <p style={{ marginTop: 12, fontSize: 13 }}>{L('Seleciona um contacto', 'Select a contact')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile: detail as modal */}
        {isMobile && selectedContact && (
          <ContactDetail
            contact={selectedContact}
            onEdit={() => setEditContact(selectedContact)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      <AddContactModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => {}}
      />

      <EditContactModal
        contact={editContact}
        onClose={() => setEditContact(null)}
        onDeleted={() => setSelectedId(null)}
      />
    </div>
  )
}

function TagFilterItem({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 'var(--radius-sm)',
        background: active ? (color ? `color-mix(in oklab, ${color} 12%, transparent)` : 'var(--bg-raised-2)') : 'transparent',
        border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left',
        color: active ? (color ?? 'var(--ink)') : 'var(--ink-dim)',
        width: '100%', transition: 'background .12s',
      }}
    >
      {color && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      )}
      {label}
    </button>
  )
}

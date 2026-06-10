'use client'

import { useState } from 'react'
import { Modal, Icon, Chip } from '@/components/ui'
import { ContactStore } from '@/lib/contact-store'
import { TAG_META } from '@/lib/contacts'
import { L, useLang } from '@/lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-inset)',
  border: '1px solid var(--edge)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--ink)',
  fontSize: 13.5,
  padding: '9px 12px',
  outline: 'none',
}

export default function AddContactModal({ open, onClose, onCreated }: Props) {
  useLang()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [emails, setEmails] = useState<string[]>([''])
  const [phones, setPhones] = useState<string[]>([''])
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [birthday, setBirthday] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [twitter, setTwitter] = useState('')
  const [instagram, setInstagram] = useState('')
  const [showSocial, setShowSocial] = useState(false)

  function reset() {
    setFirstName(''); setLastName(''); setEmails(['']); setPhones([''])
    setCompany(''); setJobTitle(''); setTags([]); setBirthday('')
    setAddress(''); setNotes(''); setLinkedin(''); setTwitter('')
    setInstagram(''); setShowSocial(false); setErr(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) { setErr(L('Nome obrigatório', 'First name required')); return }
    setSaving(true); setErr(null)
    try {
      await ContactStore.addContact({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: emails.filter(Boolean),
        phone: phones.filter(Boolean),
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        tags,
        birthday: birthday || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        social_links: {
          linkedin: linkedin.trim() || undefined,
          twitter: twitter.trim() || undefined,
          instagram: instagram.trim() || undefined,
        },
        source: 'manual',
      })
      reset()
      onCreated?.()
      onClose()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleTag(t: string) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <Modal open={open} onClose={handleClose} width={520}>
      <form onSubmit={handleSubmit} style={{ padding: '24px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
            {L('Novo Contacto', 'New Contact')}
          </span>
          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                {L('NOME *', 'FIRST NAME *')}
              </label>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={L('João', 'John')}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                {L('APELIDO', 'LAST NAME')}
              </label>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={L('Silva', 'Smith')}
              />
            </div>
          </div>

          {/* Emails */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
              EMAIL
            </label>
            {emails.map((em, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: i < emails.length - 1 ? 6 : 0 }}>
                <input
                  className="glow-focus"
                  style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                  type="email"
                  value={em}
                  onChange={e => { const n = [...emails]; n[i] = e.target.value; setEmails(n) }}
                  placeholder="email@exemplo.com"
                />
                {emails.length > 1 && (
                  <button type="button" onClick={() => setEmails(emails.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', flexShrink: 0 }}>
                    <Icon name="minus" size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setEmails([...emails, ''])}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-task)', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="plus" size={12} /> {L('+ Adicionar email', '+ Add email')}
            </button>
          </div>

          {/* Phones */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
              {L('TELEFONE', 'PHONE')}
            </label>
            {phones.map((ph, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: i < phones.length - 1 ? 6 : 0 }}>
                <input
                  className="glow-focus"
                  style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                  type="tel"
                  value={ph}
                  onChange={e => { const n = [...phones]; n[i] = e.target.value; setPhones(n) }}
                  placeholder="+351 900 000 000"
                />
                {phones.length > 1 && (
                  <button type="button" onClick={() => setPhones(phones.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', flexShrink: 0 }}>
                    <Icon name="minus" size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setPhones([...phones, ''])}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-task)', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="plus" size={12} /> {L('+ Adicionar telefone', '+ Add phone')}
            </button>
          </div>

          {/* Company + Job */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                {L('EMPRESA', 'COMPANY')}
              </label>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Lda"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                {L('CARGO', 'JOB TITLE')}
              </label>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="CEO"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 8 }}>
              TAGS
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(TAG_META).map(([key, meta]) => {
                const active = tags.includes(key)
                return (
                  <span
                    key={key}
                    onClick={() => toggleTag(key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '4px 10px', borderRadius: 99,
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', userSelect: 'none',
                      background: active ? `color-mix(in oklab, ${meta.color} 18%, transparent)` : 'var(--bg-raised-2)',
                      color: active ? meta.color : 'var(--ink-dim)',
                      border: `1px solid ${active ? `color-mix(in oklab, ${meta.color} 35%, transparent)` : 'var(--edge-soft)'}`,
                      transition: 'all .12s',
                    }}
                  >
                    {L(meta.label_pt, meta.label_en)}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Birthday + Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                {L('ANIVERSÁRIO', 'BIRTHDAY')}
              </label>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-task)', colorScheme: 'dark' } as any}
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                {L('MORADA', 'ADDRESS')}
              </label>
              <input
                className="glow-focus"
                style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={L('Lisboa, Portugal', 'Lisbon, Portugal')}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
              {L('NOTAS', 'NOTES')}
            </label>
            <textarea
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--c-task)', resize: 'vertical', minHeight: 64 } as any}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={L('Notas sobre este contacto...', 'Notes about this contact...')}
            />
          </div>

          {/* Social links toggle */}
          <button
            type="button"
            onClick={() => setShowSocial(!showSocial)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-dim)', fontSize: 12.5, display: 'flex',
              alignItems: 'center', gap: 6, padding: 0,
            }}
          >
            <Icon name={showSocial ? 'chevron-down' : 'chevron-right'} size={14} />
            {L('Redes Sociais', 'Social Links')}
          </button>

          {showSocial && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['linkedin', 'twitter', 'instagram'] as const).map(net => (
                <div key={net}>
                  <label style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>
                    {net.toUpperCase()}
                  </label>
                  <input
                    className="glow-focus"
                    style={{ ...inputStyle, '--accent': 'var(--c-task)' } as any}
                    value={net === 'linkedin' ? linkedin : net === 'twitter' ? twitter : instagram}
                    onChange={e => {
                      if (net === 'linkedin') setLinkedin(e.target.value)
                      else if (net === 'twitter') setTwitter(e.target.value)
                      else setInstagram(e.target.value)
                    }}
                    placeholder={`https://${net}.com/...`}
                  />
                </div>
              ))}
            </div>
          )}

          {err && <p style={{ color: 'var(--neg)', fontSize: 12 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn" onClick={handleClose} style={{ flex: 1, justifyContent: 'center' }}>
              {L('Cancelar', 'Cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={saving}
              style={{ flex: 1, justifyContent: 'center', '--accent': 'var(--c-task)' } as any}
            >
              {saving ? L('A guardar...', 'Saving...') : L('Guardar', 'Save')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

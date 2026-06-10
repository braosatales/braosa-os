'use client'

import { Icon } from '@/components/ui'
import { ContactStore } from '@/lib/contact-store'
import { getContactDisplayName, type Contact } from '@/lib/contacts'
import { L, useLang } from '@/lib/i18n'

type Props = {
  pending: Contact[]
  onBack: () => void
}

export default function PendingReviewPanel({ pending, onBack }: Props) {
  useLang()

  async function handleApprove(id: string) {
    await ContactStore.approveContact(id)
  }

  async function handleReject(id: string) {
    await ContactStore.rejectContact(id)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
          {L('Aguarda Revisão', 'Pending Review')}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 22, height: 22, padding: '0 6px', borderRadius: 99,
          background: 'color-mix(in oklab, var(--c-fin) 18%, transparent)',
          color: 'var(--c-fin)', fontSize: 11, fontWeight: 700,
        }}>
          {pending.length}
        </span>
      </div>

      {pending.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
          {L('Nenhum contacto pendente', 'No pending contacts')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(contact => (
            <div
              key={contact.id}
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid color-mix(in oklab, var(--c-fin) 22%, transparent)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'color-mix(in oklab, var(--c-fin) 16%, var(--bg-raised-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'var(--c-fin)',
              }}>
                {contact.first_name[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>
                  {getContactDisplayName(contact)}
                </div>
                {contact.email[0] && (
                  <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 4 }}>
                    {contact.email[0]}
                  </div>
                )}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 99,
                  background: 'color-mix(in oklab, var(--c-mail) 12%, transparent)',
                  color: 'var(--c-mail)', fontSize: 11, fontWeight: 500,
                  border: '1px solid color-mix(in oklab, var(--c-mail) 20%, transparent)',
                }}>
                  <Icon name="mail" size={10} />
                  {contact.source === 'email_extract'
                    ? L('Extraído de email', 'Extracted from email')
                    : contact.source}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn btn-accent"
                  onClick={() => handleApprove(contact.id)}
                  style={{ '--accent': 'var(--pos)', padding: '7px 14px', fontSize: 12 } as any}
                >
                  {L('Aprovar', 'Approve')}
                </button>
                <button
                  className="btn"
                  onClick={() => handleReject(contact.id)}
                  style={{ padding: '7px 14px', fontSize: 12, color: 'var(--neg)', borderColor: 'color-mix(in oklab, var(--neg) 30%, transparent)' }}
                >
                  {L('Rejeitar', 'Reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

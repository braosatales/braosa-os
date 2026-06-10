export type MailLabel = 'inbox' | 'sent' | 'drafts' | 'starred' | 'important' | 'trash' | string

export type MailMessage = {
  id: string
  threadId: string
  from: { name: string | null; email: string }
  to: { name: string | null; email: string }[]
  cc: { name: string | null; email: string }[]
  subject: string
  snippet: string
  body: string
  date: string
  read: boolean
  starred: boolean
  labels: string[]
  hasAttachments: boolean
}

export type MailThread = {
  id: string
  subject: string
  participants: { name: string | null; email: string }[]
  messages: MailMessage[]
  lastDate: string
  read: boolean
  starred: boolean
  snippet: string
  labels: string[]
  messageCount: number
}

export type MailFolder = {
  id: MailLabel
  label_pt: string
  label_en: string
  glyph: string
  color: string
  unreadCount?: number
}

export const MAIL_FOLDERS: MailFolder[] = [
  { id: 'smart',     label_pt: 'Inteligente',  label_en: 'Smart Inbox', glyph: 'wand',  color: 'var(--c-task)'   },
  { id: 'inbox',     label_pt: 'Entrada',      label_en: 'Inbox',       glyph: 'inbox', color: 'var(--c-mail)'   },
  { id: 'starred',   label_pt: 'Favoritos',    label_en: 'Starred',   glyph: 'star',  color: 'var(--c-fin)'    },
  { id: 'sent',      label_pt: 'Enviados',     label_en: 'Sent',      glyph: 'send',  color: 'var(--c-cal)'    },
  { id: 'drafts',    label_pt: 'Rascunhos',    label_en: 'Drafts',    glyph: 'edit',  color: 'var(--c-dash)'   },
  { id: 'important', label_pt: 'Importantes',  label_en: 'Important', glyph: 'flag',  color: 'var(--c-health)' },
  { id: 'trash',     label_pt: 'Lixo',         label_en: 'Trash',     glyph: 'trash', color: 'var(--neg)'      },
]

// Maps our folder ids to Gmail label ids
export const FOLDER_TO_GMAIL_LABEL: Record<string, string> = {
  inbox:     'INBOX',
  starred:   'STARRED',
  sent:      'SENT',
  drafts:    'DRAFT',
  important: 'IMPORTANT',
  trash:     'TRASH',
}

export function parseEmailAddress(raw: string): { name: string | null; email: string } {
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (m) {
    return { name: m[1].trim().replace(/^"|"$/g, '') || null, email: m[2].trim() }
  }
  return { name: null, email: raw.trim() }
}

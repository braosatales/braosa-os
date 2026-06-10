export type Contact = {
  id: string
  user_id: string
  google_contact_id: string | null
  first_name: string
  last_name: string | null
  email: string[]
  phone: string[]
  company: string | null
  job_title: string | null
  photo_url: string | null
  tags: string[]
  notes: string | null
  birthday: string | null
  address: string | null
  social_links: { linkedin?: string; twitter?: string; instagram?: string }
  source: 'manual' | 'google' | 'email_extract'
  review_status: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export type ContactInteraction = {
  id: string
  user_id: string
  contact_id: string
  type: 'email' | 'call' | 'meeting' | 'note'
  summary: string | null
  date: string
  created_at: string
}

export function getContactDisplayName(contact: Contact): string {
  return contact.last_name
    ? `${contact.first_name} ${contact.last_name}`
    : contact.first_name
}

export function getContactInitials(contact: Contact): string {
  const first = contact.first_name?.[0]?.toUpperCase() ?? ''
  const last = contact.last_name?.[0]?.toUpperCase() ?? ''
  return last ? `${first}${last}` : first
}

export const TAG_META: Record<string, { color: string; label_pt: string; label_en: string }> = {
  personal: { color: 'var(--c-health)', label_pt: 'Pessoal',     label_en: 'Personal' },
  braosa:   { color: 'var(--c-braosa)', label_pt: 'Braosa',      label_en: 'Braosa' },
  verum:    { color: 'var(--c-verum)',  label_pt: 'Verum',       label_en: 'Verum' },
  family:   { color: 'var(--c-fin)',    label_pt: 'Família',     label_en: 'Family' },
  friend:   { color: 'var(--c-cal)',    label_pt: 'Amigo',       label_en: 'Friend' },
  client:   { color: 'var(--c-task)',   label_pt: 'Cliente',     label_en: 'Client' },
  supplier: { color: 'var(--c-mail)',   label_pt: 'Fornecedor',  label_en: 'Supplier' },
}

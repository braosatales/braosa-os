'use client'
import ContactsShell from '@/components/contacts/ContactsShell'

export default function ContactsPage() {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', height: '100%' }}>
      <ContactsShell />
    </div>
  )
}

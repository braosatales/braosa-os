'use client'

import { useState, useEffect } from 'react'
import type { Contact } from './contacts'

let _contacts: Contact[] = []
let _pending: Contact[] = []
let _loading = false
let _fetched = false
const _listeners = new Set<() => void>()

export const ContactStore = {
  getContacts: () => _contacts,
  getPending: () => _pending,
  isLoading: () => _loading,
  subscribe(fn: () => void) { _listeners.add(fn); return () => _listeners.delete(fn) },
  notify() { _listeners.forEach(fn => fn()) },
  invalidate() { _contacts = []; _pending = []; _fetched = false; ContactStore.fetch() },

  async fetch() {
    if (_loading) return
    _loading = true; _fetched = true; ContactStore.notify()
    try {
      const [cr, pr] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/contacts/pending'),
      ])
      if (cr.ok) { const d = await cr.json(); _contacts = d.contacts ?? [] }
      if (pr.ok) { const d = await pr.json(); _pending = d.contacts ?? [] }
    } finally { _loading = false; ContactStore.notify() }
  },

  async addContact(data: Partial<Contact>): Promise<Contact> {
    const r = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
      throw new Error(e.error || `Request failed (${r.status})`)
    }
    const d = await r.json()
    _contacts = [d.contact, ..._contacts]
    ContactStore.notify()
    return d.contact
  },

  async updateContact(id: string, data: Partial<Contact>): Promise<void> {
    _contacts = _contacts.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)
    ContactStore.notify()
    const r = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) ContactStore.invalidate()
  },

  async deleteContact(id: string): Promise<void> {
    _contacts = _contacts.filter(c => c.id !== id)
    ContactStore.notify()
    const r = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (!r.ok) ContactStore.invalidate()
  },

  async approveContact(id: string): Promise<void> {
    const contact = _pending.find(c => c.id === id)
    _pending = _pending.filter(c => c.id !== id)
    if (contact) {
      _contacts = [{ ...contact, review_status: null }, ..._contacts]
    }
    ContactStore.notify()
    const r = await fetch(`/api/contacts/pending/${id}`, { method: 'POST' })
    if (!r.ok) ContactStore.invalidate()
  },

  async rejectContact(id: string): Promise<void> {
    _pending = _pending.filter(c => c.id !== id)
    ContactStore.notify()
    const r = await fetch(`/api/contacts/pending/${id}`, { method: 'DELETE' })
    if (!r.ok) ContactStore.invalidate()
  },

  async syncGoogle(): Promise<{ synced: number; new: number; updated: number }> {
    const r = await fetch('/api/contacts/google-sync', { method: 'POST' })
    if (!r.ok) {
      const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
      throw new Error(e.error || `Request failed (${r.status})`)
    }
    const result = await r.json()
    ContactStore.invalidate()
    return result
  },
}

export function useContactStore(): { contacts: Contact[]; pending: Contact[]; loading: boolean } {
  const [, rerender] = useState(0)
  useEffect(() => {
    const unsub = ContactStore.subscribe(() => rerender(n => n + 1))
    if (!_fetched && !_loading) ContactStore.fetch()
    return () => { unsub() }
  }, [])
  return {
    contacts: ContactStore.getContacts(),
    pending: ContactStore.getPending(),
    loading: ContactStore.isLoading(),
  }
}

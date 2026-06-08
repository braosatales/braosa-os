'use client'

import { useState, useEffect } from 'react'
import type { Note } from './notes'

let _notes: Note[] = []
let _loading = false
let _fetched = false
const _listeners = new Set<() => void>()

export const NoteStore = {
  getNotes(): Note[] { return _notes },
  isLoading(): boolean { return _loading },
  subscribe(fn: () => void): () => void {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
  notify(): void { _listeners.forEach(fn => fn()) },
  invalidate(): void { _notes = []; _fetched = false; NoteStore.fetch() },

  async fetch(): Promise<void> {
    if (_loading) return
    _loading = true; _fetched = true; NoteStore.notify()
    try {
      const r = await fetch('/api/notes')
      if (r.ok) { const d = await r.json(); _notes = d.notes ?? [] }
    } finally { _loading = false; NoteStore.notify() }
  },

  async createNote(data: Partial<Note>): Promise<Note> {
    const r = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error('Failed to create note')
    const d = await r.json()
    const created: Note = d.note
    _notes = [created, ..._notes]
    NoteStore.notify()
    return created
  },

  async updateNote(id: string, data: Partial<Note>): Promise<void> {
    _notes = _notes.map(n => n.id === id ? { ...n, ...data, updated_at: new Date().toISOString() } : n)
    NoteStore.notify()
    const r = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) NoteStore.invalidate()
  },

  async deleteNote(id: string): Promise<void> {
    _notes = _notes.filter(n => n.id !== id)
    NoteStore.notify()
    const r = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (!r.ok) NoteStore.invalidate()
  },

  async archiveNote(id: string): Promise<void> {
    _notes = _notes.filter(n => n.id !== id)
    NoteStore.notify()
    const r = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    if (!r.ok) NoteStore.invalidate()
  },
}

export function useNoteStore(): { notes: Note[]; loading: boolean } {
  const [, rerender] = useState(0)
  useEffect(() => {
    const unsub = NoteStore.subscribe(() => rerender(n => n + 1))
    if (!_fetched && !_loading) NoteStore.fetch()
    return () => { unsub() }
  }, [])
  return { notes: NoteStore.getNotes(), loading: NoteStore.isLoading() }
}

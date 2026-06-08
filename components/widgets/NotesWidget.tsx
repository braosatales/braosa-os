'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/os/Icon'
import NoteModal from '@/components/notes/NoteModal'
import type { Note } from '@/lib/types'

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function NotesWidget() {
  const [notes, setNotes] = useState<Note[]>([])
  const [openNote, setOpenNote] = useState<Note | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/notes')
      .then(r => r.json())
      .then(d => setNotes((d.notes ?? []).slice(0, 5)))
      .catch(() => {})
  }, [])

  const handleSaved = (note: Note) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = note
        return next
      }
      return [note, ...prev].slice(0, 5)
    })
  }

  const handleDeleted = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {notes.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>No notes yet</span>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setOpenNote(note)}
              style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 8, padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised-2)', border: '1px solid var(--edge-soft)',
                cursor: 'pointer', textAlign: 'left', transition: 'background .12s',
              }}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {note.title || note.content.split('\n')[0].slice(0, 40) || 'Untitled'}
                </div>
                {note.content && (
                  <div style={{
                    fontSize: 11, color: 'var(--ink-faint)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginTop: 1,
                  }}>
                    {note.content.slice(0, 60)}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0, paddingTop: 1 }}>
                {relTime(note.updated_at)}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpenNote(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: '1px dashed var(--edge)',
          borderRadius: 'var(--radius-sm)', padding: '5px 10px',
          color: 'var(--ink-faint)', fontSize: 12, cursor: 'pointer',
          transition: 'all .12s', justifyContent: 'center',
        }}
      >
        <Icon name="plus" size={12} /> New note
      </button>

      {openNote !== undefined && (
        <NoteModal
          note={openNote}
          onClose={() => setOpenNote(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

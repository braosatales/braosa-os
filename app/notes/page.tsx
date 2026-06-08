'use client'

import { useState, useEffect, useMemo } from 'react'
import Icon from '@/components/os/Icon'
import NoteModal from '@/components/notes/NoteModal'
import type { Note } from '@/lib/types'

const COLOR_BG: Record<string, string> = {
  default: 'var(--bg-raised)',
  yellow:  'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.74 0.13 85))',
  green:   'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.76 0.085 152))',
  blue:    'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.72 0.095 242))',
  purple:  'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.70 0.125 292))',
  pink:    'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.71 0.12 350))',
}

const COLOR_DOT: Record<string, string> = {
  default: 'var(--ink-faint)',
  yellow:  'oklch(0.74 0.13 85)',
  green:   'oklch(0.76 0.085 152)',
  blue:    'oklch(0.72 0.095 242)',
  purple:  'oklch(0.70 0.125 292)',
  pink:    'oklch(0.71 0.12 350)',
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function NoteCard({
  note,
  grid,
  onClick,
  onPinToggle,
}: {
  note: Note
  grid: boolean
  onClick: () => void
  onPinToggle: (e: React.MouseEvent) => void
}) {
  const titleDisplay = note.title || note.content.split('\n')[0].slice(0, 60) || 'Untitled'
  const preview = note.content.slice(0, 160)

  return (
    <div
      onClick={onClick}
      style={{
        background: COLOR_BG[note.color] ?? COLOR_BG.default,
        border: '1px solid var(--edge)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'border-color .12s, transform .12s',
        position: 'relative',
      }}
      className="note-card"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 3,
          background: COLOR_DOT[note.color] ?? COLOR_DOT.default,
        }} />
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink)',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        }}>
          {titleDisplay}
        </span>
        <button
          onClick={onPinToggle}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: note.pinned ? 'var(--c-fin)' : 'var(--ink-faint)',
            flexShrink: 0, display: 'flex', alignItems: 'center',
            transition: 'color .12s',
          }}
        >
          <Icon name="star" size={13} />
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <p style={{
          fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: grid ? 3 : 2, WebkitBoxOrient: 'vertical',
        }}>
          {preview}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        {note.tags.slice(0, 3).map(tag => (
          <span key={tag} style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 20,
            background: 'var(--bg-inset)', color: 'var(--ink-faint)',
            border: '1px solid var(--edge-soft)',
          }}>{tag}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-faint)' }}>
          {relTime(note.updated_at)}
        </span>
      </div>
    </div>
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [grid, setGrid] = useState(true)
  const [openNote, setOpenNote] = useState<Note | null | undefined>(undefined)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/notes')
    const data = await res.json()
    setNotes(data.notes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return notes
    const q = search.toLowerCase()
    return notes.filter(n =>
      (n.title ?? '').toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [notes, search])

  const pinned = filtered.filter(n => n.pinned)
  const regular = filtered.filter(n => !n.pinned)

  const handleSaved = (note: Note) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = note
        return next.sort((a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      }
      return [note, ...prev]
    })
  }

  const handleDeleted = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setOpenNote(undefined)
  }

  const handlePinToggle = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !note.pinned
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: next } : n).sort((a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ))
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: next }),
    })
  }

  const gridStyle: React.CSSProperties = grid
    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }
    : { display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={{ paddingTop: 62, minHeight: '100vh', background: 'var(--bg-void)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginRight: 4 }}>
            Notes
          </h1>
          <div style={{
            flex: 1, maxWidth: 320,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-raised)', border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)', padding: '7px 12px',
          }}>
            <Icon name="target" size={13} style={{ color: 'var(--ink-faint)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--ink)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button
              onClick={() => setGrid(true)}
              style={{
                background: grid ? 'var(--bg-raised-2)' : 'none',
                border: grid ? '1px solid var(--edge)' : '1px solid transparent',
                borderRadius: 6, padding: '6px 7px', cursor: 'pointer',
                color: grid ? 'var(--ink)' : 'var(--ink-faint)',
                display: 'flex', alignItems: 'center', transition: 'all .12s',
              }}
            >
              <Icon name="grid" size={14} />
            </button>
            <button
              onClick={() => setGrid(false)}
              style={{
                background: !grid ? 'var(--bg-raised-2)' : 'none',
                border: !grid ? '1px solid var(--edge)' : '1px solid transparent',
                borderRadius: 6, padding: '6px 7px', cursor: 'pointer',
                color: !grid ? 'var(--ink)' : 'var(--ink-faint)',
                display: 'flex', alignItems: 'center', transition: 'all .12s',
              }}
            >
              <Icon name="chart" size={14} />
            </button>
          </div>

          <button
            onClick={() => setOpenNote(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--c-dash-dim)', border: '1px solid var(--c-dash)',
              borderRadius: 'var(--radius-sm)', padding: '7px 14px',
              color: 'var(--c-dash)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            <Icon name="plus" size={14} /> New Note
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
            <div style={{ fontSize: 13 }}>Loading…</div>
          </div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 80 }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>✦</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-dim)', marginBottom: 6 }}>No notes yet</div>
            <div style={{ fontSize: 13 }}>Create your first note to capture ideas, plans, and more.</div>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: 'var(--ink-faint)',
                  fontFamily: 'var(--mono)', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Icon name="star" size={11} style={{ color: 'var(--c-fin)' }} /> Pinned
                </div>
                <div style={gridStyle}>
                  {pinned.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      grid={grid}
                      onClick={() => setOpenNote(note)}
                      onPinToggle={e => handlePinToggle(note, e)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All notes section */}
            {regular.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                    textTransform: 'uppercase', color: 'var(--ink-faint)',
                    fontFamily: 'var(--mono)', marginBottom: 12,
                  }}>
                    All Notes
                  </div>
                )}
                <div style={gridStyle}>
                  {regular.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      grid={grid}
                      onClick={() => setOpenNote(note)}
                      onPinToggle={e => handlePinToggle(note, e)}
                    />
                  ))}
                </div>
              </section>
            )}

            {search && filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
                <div style={{ fontSize: 13 }}>No notes match &ldquo;{search}&rdquo;</div>
              </div>
            )}
          </>
        )}
      </div>

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

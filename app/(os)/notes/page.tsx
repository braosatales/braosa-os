'use client'

import { useState } from 'react'
import { useNoteStore } from '@/lib/note-store'
import { NoteStore } from '@/lib/note-store'
import { Icon, EmptyState } from '@/components/ui'
import NoteCard from '@/components/notes/NoteCard'
import NoteModal from '@/components/notes/NoteModal'
import { L } from '@/lib/i18n'
import type { Note } from '@/lib/notes'

type ViewMode = 'grid' | 'list'

export default function NotesPage() {
  const { notes, loading } = useNoteStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [fabHovered, setFabHovered] = useState(false)

  const filtered = notes.filter((n) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (n.title?.toLowerCase().includes(q)) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    )
  })
  const pinned = filtered.filter(n => n.pinned)
  const all = filtered.filter(n => !n.pinned)

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 14,
  }
  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }
  const containerStyle = viewMode === 'grid' ? gridStyle : listStyle

  const showModal = selectedNote !== null || creatingNew

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px 0' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
          {L('Notas', 'Notes')}
        </span>
        <span style={{ color: 'var(--ink-faint)', fontSize: 14 }}>({notes.length})</span>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-raised)',
            border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 12px',
            width: 240,
            height: 34,
          }}
        >
          <span style={{ color: 'var(--ink-faint)', display: 'flex' }}>
            <Icon name="search" size={14} />
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={L('Pesquisar notas…', 'Search notes…')}
            className="glow-focus"
            style={{
              fontSize: 13,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              flex: 1,
              outline: 'none',
              // @ts-expect-error css var
              '--accent': 'var(--c-task)',
            }}
          />
        </div>

        {/* View toggle */}
        {(['grid', 'list'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: viewMode === mode ? 'var(--c-task-dim)' : 'transparent',
              color: viewMode === mode ? 'var(--c-task)' : 'var(--ink-faint)',
            }}
          >
            <Icon name={mode === 'grid' ? 'board' : 'list'} size={15} />
          </button>
        ))}

        {/* New note */}
        <button
          type="button"
          onClick={() => setCreatingNew(true)}
          style={{
            background: 'var(--c-task-dim)',
            border: '1px solid var(--c-task)',
            color: 'var(--c-task)',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {L('+ Nova Nota', '+ New Note')}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {/* Loading skeletons */}
        {loading && notes.length === 0 && (
          <div style={gridStyle}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  background: 'var(--bg-raised-2)',
                  borderRadius: 'var(--radius)',
                  animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        {/* Empty states */}
        {!loading && notes.length === 0 && (
          <EmptyState
            icon="note"
            title={L('Nenhuma nota ainda', 'No notes yet')}
            action={{ label: L('+ Nova Nota', '+ New Note'), onClick: () => setCreatingNew(true) }}
          />
        )}
        {!loading && notes.length > 0 && filtered.length === 0 && searchQuery && (
          <EmptyState
            icon="search"
            title={L('Sem resultados', 'No results')}
            subtitle={L('Tenta outra pesquisa', 'Try a different search')}
          />
        )}

        {/* Pinned */}
        {pinned.length > 0 && (
          <div style={{ marginBottom: all.length > 0 ? 0 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--ink-faint)',
                letterSpacing: '0.14em',
              }}>
                {L('FIXADAS', 'PINNED')}
              </span>
            </div>
            <div style={containerStyle}>
              {pinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => setSelectedNote(note)}
                  onPinToggle={() => NoteStore.updateNote(note.id, { pinned: !note.pinned })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {pinned.length > 0 && all.length > 0 && (
          <div style={{ height: 1, background: 'var(--edge-soft)', margin: '16px 0' }} />
        )}

        {/* All notes */}
        {all.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.14em',
                }}>
                  {L('NOTAS', 'NOTES')}
                </span>
              </div>
            )}
            <div style={containerStyle}>
              {all.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => setSelectedNote(note)}
                  onPinToggle={() => NoteStore.updateNote(note.id, { pinned: !note.pinned })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating compose button */}
      <button
        type="button"
        onClick={() => setCreatingNew(true)}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 50,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--c-task)',
          color: 'oklch(0.18 0.01 80)',
          cursor: 'pointer',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 calc(30px * var(--glow)) -6px var(--c-task)',
          transform: fabHovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform .14s',
        }}
      >
        <Icon name="plus" size={22} />
      </button>

      {/* Modal */}
      {showModal && (
        <NoteModal
          note={selectedNote}
          onClose={() => { setSelectedNote(null); setCreatingNew(false) }}
        />
      )}
    </div>
  )
}

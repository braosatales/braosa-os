'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui'
import { NOTE_COLORS } from '@/lib/notes'
import { relativeTime } from '@/lib/date'
import type { Note } from '@/lib/notes'

type Props = {
  note: Note
  onClick: () => void
  onPinToggle: () => void
}

export default function NoteCard({ note, onClick, onPinToggle }: Props) {
  const [hovered, setHovered] = useState(false)
  const colors = NOTE_COLORS[note.color]

  const displayTitle = note.title || note.content.split('\n')[0].slice(0, 60)

  const contentPreview = note.title
    ? note.content.slice(0, 150)
    : note.content.split('\n').slice(1).join('\n').slice(0, 150)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'box-shadow .18s, border-color .18s',
        background: colors.bg,
        border: `1px solid ${hovered ? 'var(--edge-strong)' : colors.border}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        boxShadow: hovered ? 'var(--shadow-card)' : 'none',
      }}
    >
      {(hovered || note.pinned) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPinToggle() }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 26,
            height: 26,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: hovered ? 'var(--bg-raised-2)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: note.pinned ? 'var(--c-task)' : 'var(--ink-faint)',
            padding: 0,
          }}
        >
          <Icon name="pin" size={13} />
        </button>
      )}

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13.5,
          fontWeight: 600,
          color: note.title ? 'var(--ink)' : 'var(--ink-dim)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: 30,
        }}
      >
        {displayTitle || ' '}
      </div>

      {contentPreview && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12.5,
            color: 'var(--ink-dim)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {contentPreview}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {note.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              padding: '2px 7px',
              background: 'var(--c-task-dim)',
              color: 'var(--c-task)',
              borderRadius: 99,
            }}
          >
            {tag}
          </span>
        ))}
        {note.tags.length > 3 && (
          <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            +{note.tags.length - 3}
          </span>
        )}
        {note.color !== 'default' && (
          <div
            style={{
              marginLeft: 'auto',
              width: 8,
              height: 8,
              borderRadius: 99,
              background: colors.border,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-faint)',
            marginLeft: note.color === 'default' ? 'auto' : '6px',
            flexShrink: 0,
          }}
        >
          {relativeTime(note.updated_at)}
        </span>
      </div>
    </div>
  )
}

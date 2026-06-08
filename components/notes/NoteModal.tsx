'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '@/components/os/Icon'
import type { Note } from '@/lib/types'

const COLORS = [
  { id: 'default', bg: 'transparent',                      border: 'var(--edge)',           dot: 'var(--ink-faint)' },
  { id: 'yellow',  bg: 'oklch(0.74 0.13 85 / 0.12)',       border: 'oklch(0.74 0.13 85)',   dot: 'oklch(0.74 0.13 85)' },
  { id: 'green',   bg: 'oklch(0.76 0.085 152 / 0.12)',     border: 'oklch(0.76 0.085 152)', dot: 'oklch(0.76 0.085 152)' },
  { id: 'blue',    bg: 'oklch(0.72 0.095 242 / 0.12)',     border: 'oklch(0.72 0.095 242)', dot: 'oklch(0.72 0.095 242)' },
  { id: 'purple',  bg: 'oklch(0.70 0.125 292 / 0.12)',     border: 'oklch(0.70 0.125 292)', dot: 'oklch(0.70 0.125 292)' },
  { id: 'pink',    bg: 'oklch(0.71 0.12 350 / 0.12)',      border: 'oklch(0.71 0.12 350)',  dot: 'oklch(0.71 0.12 350)' },
]

interface Props {
  note?: Note | null
  onClose: () => void
  onSaved: (note: Note) => void
  onDeleted?: (id: string) => void
}

export default function NoteModal({ note: initialNote, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(initialNote?.title ?? '')
  const [content, setContent] = useState(initialNote?.content ?? '')
  const [color, setColor] = useState(initialNote?.color ?? 'default')
  const [pinned, setPinned] = useState(initialNote?.pinned ?? false)
  const [tags, setTags] = useState<string[]>(initialNote?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  const noteIdRef = useRef<string | null>(initialNote?.id ?? null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [content])

  // escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { flushSave(); onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  const doSave = useCallback(async (
    t = title, c = content, col = color, p = pinned, tgs = tags
  ) => {
    if (!t && !c) return
    const payload = { title: t || null, content: c, color: col, pinned: p, tags: tgs }

    if (!noteIdRef.current) {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        noteIdRef.current = data.note.id
        onSaved(data.note)
      }
    } else {
      const res = await fetch(`/api/notes/${noteIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        onSaved(data.note)
      }
    }
  }, [title, content, color, pinned, tags, onSaved])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(), 1000)
  }, [doSave])

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    doSave()
  }, [doSave])

  // trigger debounced save on any field change
  useEffect(() => { scheduleSave() }, [title, content, color, pinned, tags]) // eslint-disable-line react-hooks/exhaustive-deps

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleArchive = async () => {
    if (!noteIdRef.current) { onClose(); return }
    await fetch(`/api/notes/${noteIdRef.current}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    onDeleted?.(noteIdRef.current)
    onClose()
  }

  const handleDelete = async () => {
    if (!noteIdRef.current) { onClose(); return }
    await fetch(`/api/notes/${noteIdRef.current}`, { method: 'DELETE' })
    onDeleted?.(noteIdRef.current)
    onClose()
  }

  const handlePinToggle = () => {
    const next = !pinned
    setPinned(next)
    if (noteIdRef.current) {
      fetch(`/api/notes/${noteIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: next }),
      })
    }
  }

  const colorInfo = COLORS.find(c => c.id === color) ?? COLORS[0]

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) { flushSave(); onClose() } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'oklch(0.12 0.006 70 / 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 680,
        maxHeight: '88vh',
        background: colorInfo.bg !== 'transparent'
          ? `color-mix(in oklch, var(--bg-raised) 88%, ${colorInfo.dot})`
          : 'var(--bg-raised)',
        border: `1px solid ${colorInfo.border}`,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-pop, 0 20px 60px oklch(0 0 0 / 0.5))',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 8px' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={flushSave}
            placeholder="Untitled"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 18, fontWeight: 700, color: 'var(--ink)',
              fontFamily: 'var(--display)',
            }}
          />
          <button
            onClick={() => { flushSave(); onClose() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-faint)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              transition: 'color .12s',
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Textarea */}
        <div style={{ flex: 1, padding: '0 20px', overflow: 'auto', minHeight: 160 }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={flushSave}
            placeholder="Start writing…"
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--ink-soft)', fontFamily: 'var(--body)', fontSize: 14,
              lineHeight: 1.7, resize: 'none', minHeight: 200,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tags row */}
        {(tags.length > 0 || tagInput !== '') && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 20px 10px' }}>
            {tags.map(tag => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
                  borderRadius: 20, padding: '2px 8px', fontSize: 11, color: 'var(--ink-dim)',
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 0, lineHeight: 1 }}
                >×</button>
              </span>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px',
          borderTop: '1px solid var(--edge-soft)',
          flexWrap: 'wrap',
        }}>
          {/* Color picker */}
          <div style={{ display: 'flex', gap: 6 }}>
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                title={c.id}
                style={{
                  width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: c.id === 'default' ? 'var(--bg-raised-2)' : c.dot,
                  outline: color === c.id ? `2px solid ${c.dot === 'var(--ink-faint)' ? 'var(--edge-strong)' : c.dot}` : 'none',
                  outlineOffset: 2,
                  transition: 'outline .12s',
                }}
              />
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--edge)', margin: '0 4px' }} />

          {/* Tag input */}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Add tag…"
            style={{
              background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', color: 'var(--ink-dim)', fontSize: 12,
              padding: '4px 10px', width: 100, outline: 'none',
            }}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {/* Pin */}
            <button
              onClick={handlePinToggle}
              title={pinned ? 'Unpin' : 'Pin'}
              style={{
                background: pinned ? 'var(--c-fin-dim)' : 'none',
                border: pinned ? '1px solid var(--c-fin)' : '1px solid transparent',
                borderRadius: 6, cursor: 'pointer', padding: '5px 6px',
                color: pinned ? 'var(--c-fin)' : 'var(--ink-faint)',
                display: 'flex', alignItems: 'center', transition: 'all .12s',
              }}
            >
              <Icon name="star" size={14} />
            </button>

            {/* Archive */}
            <button
              onClick={handleArchive}
              title="Archive"
              style={{
                background: 'none', border: '1px solid transparent', borderRadius: 6,
                cursor: 'pointer', padding: '5px 6px',
                color: 'var(--ink-faint)', display: 'flex', alignItems: 'center',
                transition: 'all .12s',
              }}
            >
              <Icon name="arrow" size={14} />
            </button>

            {/* Delete */}
            {noteIdRef.current && (
              <button
                onClick={handleDelete}
                title="Delete"
                style={{
                  background: 'none', border: '1px solid transparent', borderRadius: 6,
                  cursor: 'pointer', padding: '5px 6px',
                  color: 'var(--ink-faint)', display: 'flex', alignItems: 'center',
                  transition: 'color .12s',
                }}
              >
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

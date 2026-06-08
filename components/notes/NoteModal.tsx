'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '@/components/os/Icon'
import type { Note } from '@/lib/types'

const COLORS = [
  { id: 'default', dot: 'var(--ink-faint)' },
  { id: 'yellow',  dot: 'oklch(0.74 0.13 85)' },
  { id: 'green',   dot: 'oklch(0.76 0.085 152)' },
  { id: 'blue',    dot: 'oklch(0.72 0.095 242)' },
  { id: 'purple',  dot: 'oklch(0.70 0.125 292)' },
  { id: 'pink',    dot: 'oklch(0.71 0.12 350)' },
]

const COLOR_BG: Record<string, string> = {
  default: 'var(--bg-raised)',
  yellow:  'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.74 0.13 85))',
  green:   'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.76 0.085 152))',
  blue:    'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.72 0.095 242))',
  purple:  'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.70 0.125 292))',
  pink:    'color-mix(in oklch, var(--bg-raised) 88%, oklch(0.71 0.12 350))',
}

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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Ref to latest field values so the debounced save always gets fresh data
  const latestRef = useRef({ title, content, color, pinned, tags })
  useEffect(() => { latestRef.current = { title, content, color, pinned, tags } }, [title, content, color, pinned, tags])

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

  const doSave = useCallback(async () => {
    const { title: t, content: c, color: col, pinned: p, tags: tgs } = latestRef.current
    if (!t?.trim() && !c?.trim()) return
    const payload = { title: t?.trim() || null, content: c, color: col, pinned: p, tags: tgs }
    setSaving(true)
    setSaveError(null)

    try {
      if (!noteIdRef.current) {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[NoteModal] POST failed', res.status, err)
          setSaveError(`Could not save (${res.status})`)
          return
        }
        const data = await res.json()
        noteIdRef.current = data.note.id
        onSaved(data.note)
      } else {
        const res = await fetch(`/api/notes/${noteIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('[NoteModal] PATCH failed', res.status, err)
          setSaveError(`Could not save (${res.status})`)
          return
        }
        const data = await res.json()
        onSaved(data.note)
      }
    } finally {
      setSaving(false)
    }
  }, [onSaved])

  // Keep a ref to doSave so the timer callback is always current
  const doSaveRef = useRef(doSave)
  useEffect(() => { doSaveRef.current = doSave }, [doSave])

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimerRef.current ?? undefined)
    saveTimerRef.current = setTimeout(() => doSaveRef.current(), 1000)
  }, [])

  const flushSave = useCallback(() => {
    clearTimeout(saveTimerRef.current ?? undefined)
    doSaveRef.current()
  }, [])

  // Trigger debounced save on any field change (skip initial mount)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    scheduleSave()
  }, [title, content, color, pinned, tags, scheduleSave])

  // Escape to close (flush save first)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { flushSave(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flushSave, onClose])

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

  const colorDot = COLORS.find(c => c.id === color)?.dot ?? 'var(--ink-faint)'

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
        width: '100%', maxWidth: 680, maxHeight: '88vh',
        background: COLOR_BG[color] ?? COLOR_BG.default,
        border: `1px solid ${color === 'default' ? 'var(--edge)' : colorDot}`,
        borderRadius: 'var(--radius)',
        boxShadow: '0 20px 60px oklch(0 0 0 / 0.5)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving && (
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Saving…</span>
            )}
            {saveError && (
              <span style={{ fontSize: 11, color: 'oklch(0.70 0.13 38)', maxWidth: 160, textAlign: 'right' }}>{saveError}</span>
            )}
            <button
              onClick={() => { flushSave(); onClose() }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-faint)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', transition: 'color .12s',
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
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

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 20px 10px' }}>
            {tags.map(tag => (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
                borderRadius: 20, padding: '2px 8px', fontSize: 11, color: 'var(--ink-dim)',
              }}>
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 0 }}
                >×</button>
              </span>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderTop: '1px solid var(--edge-soft)',
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
                  outline: color === c.id ? `2px solid ${c.dot}` : 'none',
                  outlineOffset: 2, transition: 'outline .12s',
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
            <button
              onClick={handleArchive}
              title="Archive"
              style={{
                background: 'none', border: '1px solid transparent', borderRadius: 6,
                cursor: 'pointer', padding: '5px 6px',
                color: 'var(--ink-faint)', display: 'flex', alignItems: 'center',
              }}
            >
              <Icon name="arrow" size={14} />
            </button>
            {noteIdRef.current && (
              <button
                onClick={handleDelete}
                title="Delete permanently"
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

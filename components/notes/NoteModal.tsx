'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Modal, Icon, Chip } from '@/components/ui'
import { NoteStore } from '@/lib/note-store'
import { NOTE_COLORS } from '@/lib/notes'
import { L } from '@/lib/i18n'
import type { Note, NoteColor } from '@/lib/notes'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useKeyboardHeight } from '@/lib/hooks/useKeyboardHeight'

type Props = {
  note: Note | null
  onClose: () => void
}

const COLOR_ORDER: NoteColor[] = ['default', 'yellow', 'green', 'blue', 'purple', 'pink']

export default function NoteModal({ note, onClose }: Props) {
  const isMobile = useIsMobile()
  const keyboardHeight = useKeyboardHeight()
  const [local, setLocal] = useState<Partial<Note>>(
    () => note ?? { title: '', content: '', color: 'default', pinned: false, tags: [] }
  )
  const [noteId, setNoteId] = useState<string | null>(note?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localRef = useRef(local)
  const noteIdRef = useRef(noteId)

  useEffect(() => { localRef.current = local }, [local])
  useEffect(() => { noteIdRef.current = noteId }, [noteId])

  const saveChanges = useCallback(async (changes: Partial<Note>) => {
    if (noteIdRef.current) {
      setSaving(true)
      await NoteStore.updateNote(noteIdRef.current, changes)
      setSaving(false)
    } else {
      setSaving(true)
      const created = await NoteStore.createNote({
        content: '', color: 'default', pinned: false, tags: [],
        ...localRef.current, ...changes,
      })
      setNoteId(created.id)
      setSaving(false)
    }
  }, [])

  const debounceSave = (changes: Partial<Note>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      saveChanges(changes)
    }, 1000)
  }

  const handleChange = (field: keyof Note, value: unknown) => {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    debounceSave(updated)
  }

  const flushSave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      saveChanges(localRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        const currentLocal = localRef.current
        const currentId = noteIdRef.current
        if (currentId) {
          NoteStore.updateNote(currentId, currentLocal).catch(() => {})
        } else if (currentLocal.content || currentLocal.title) {
          NoteStore.createNote({
            content: '', color: 'default', pinned: false, tags: [],
            ...currentLocal,
          }).catch(() => {})
        }
      }
    }
  }, [])

  const addTag = () => {
    const tag = tagInput.replace(/,$/, '').trim()
    if (!tag) return
    const current = local.tags ?? []
    if (current.length >= 8 || current.includes(tag)) { setTagInput(''); return }
    handleChange('tags', [...current, tag])
    setTagInput('')
  }

  const color = (local.color ?? 'default') as NoteColor

  return (
    <Modal open onClose={() => { flushSave(); onClose() }} width={680} fullScreen={isMobile}>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 0, flex: isMobile ? 1 : undefined, paddingBottom: isMobile ? Math.max(24, keyboardHeight + 12) : 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input
            value={local.title ?? ''}
            onChange={(e) => handleChange('title', e.target.value || null)}
            onBlur={flushSave}
            placeholder={L('Sem título', 'Untitled')}
            style={{
              flex: 1,
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              outline: 'none',
              minWidth: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-faint)',
              opacity: saving ? 1 : 0,
              transition: 'opacity .2s',
              flexShrink: 0,
            }}
          >
            {L('A guardar…', 'Saving…')}
          </span>
          <button
            type="button"
            onClick={() => { flushSave(); onClose() }}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-faint)',
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <textarea
          value={local.content ?? ''}
          onChange={(e) => {
            handleChange('content', e.target.value)
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
          }}
          onInput={(e) => {
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
          }}
          onBlur={flushSave}
          placeholder={L('Começa a escrever…', 'Start writing…')}
          style={{
            width: '100%',
            minHeight: isMobile ? 0 : 200,
            flex: isMobile ? 1 : undefined,
            maxHeight: isMobile ? 'none' : '60vh',
            overflowY: 'auto',
            resize: 'none',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-soft)',
            fontSize: 14,
            lineHeight: 1.65,
            fontFamily: 'var(--font-body)',
            outline: 'none',
          }}
        />

        {/* Bottom toolbar */}
        <div
          style={{
            borderTop: '1px solid var(--edge-soft)',
            paddingTop: 12,
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {/* Color picker */}
          <div style={{ display: 'flex', gap: 6 }}>
            {COLOR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleChange('color', c)}
                title={NOTE_COLORS[c].label}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                  padding: 0,
                  background: c === 'default' ? 'var(--bg-raised-2)' : NOTE_COLORS[c].border,
                  outline: color === c
                    ? `2px solid ${c === 'default' ? 'var(--edge-strong)' : NOTE_COLORS[c].border}`
                    : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            {(local.tags ?? []).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                color="var(--c-task)"
                onRemove={() => handleChange('tags', (local.tags ?? []).filter(t => t !== tag))}
              />
            ))}
            {(local.tags ?? []).length < 8 && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                onBlur={() => { if (tagInput.trim()) addTag() }}
                placeholder="+ tag"
                style={{
                  fontSize: 12,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ink-dim)',
                  width: 80,
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              title={L('Fixar', 'Pin')}
              onClick={() => handleChange('pinned', !local.pinned)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: local.pinned ? 'var(--c-task)' : 'var(--ink-faint)',
              }}
            >
              <Icon name="pin" size={15} />
            </button>
            <button
              type="button"
              title={L('Arquivar', 'Archive')}
              onClick={async () => {
                if (noteId) { flushSave(); await NoteStore.archiveNote(noteId) }
                onClose()
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-faint)',
              }}
            >
              <Icon name="archive" size={15} />
            </button>
            <button
              type="button"
              title={L('Eliminar', 'Delete')}
              onClick={async () => {
                if (noteId) { flushSave(); await NoteStore.deleteNote(noteId) }
                onClose()
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-faint)',
              }}
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

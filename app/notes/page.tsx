'use client'
import { useState, useEffect } from 'react'
import TopNav from '@/components/os/TopNav'

type Note = {
  id: string
  content: string
  world: string | null
  status: 'unread' | 'read'
  created_at: string
}

const WORLDS = [
  { value: null,       label: 'Untagged',      color: 'var(--ink-faint)' },
  { value: 'personal', label: 'Personal',       color: 'var(--c-dash)' },
  { value: 'verum',    label: 'VerumForma',     color: 'var(--c-verum)' },
  { value: 'braosa',   label: 'Braosa Tales',   color: 'var(--c-braosa)' },
]

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [world, setWorld] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/notes')
    const data = await res.json()
    setNotes(data.notes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!content.trim()) return
    setSaving(true)
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, world }),
    })
    if (res.ok) {
      setContent('')
      setWorld(null)
      await load()
    }
    setSaving(false)
  }

  const worldInfo = (w: string | null) =>
    WORLDS.find(x => x.value === w) ?? WORLDS[0]

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const unread = notes.filter(n => n.status === 'unread')
  const read   = notes.filter(n => n.status === 'read')

  return (
    <div style={{ background: 'var(--bg-void)', minHeight: '100vh', color: 'var(--ink)' }}>
      <TopNav onLock={() => window.dispatchEvent(new CustomEvent('braosa:lock'))} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '56px 16px 80px' }}>

        {/* Compose */}
        <div style={{
          background: 'var(--bg-raised)', border: '1px solid var(--edge)',
          borderRadius: 'var(--radius)', padding: '16px', marginBottom: 24,
        }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
            placeholder="Capture a thought…"
            rows={3}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: 'var(--ink)', fontFamily: 'var(--body)', fontSize: 15,
              resize: 'none', outline: 'none', lineHeight: 1.6,
            }}
          />

          {/* World selector + save */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            {WORLDS.map(w => (
              <button
                key={String(w.value)}
                onClick={() => setWorld(w.value)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--body)',
                  background: world === w.value ? `color-mix(in oklch, ${w.color} 20%, transparent)` : 'var(--bg-raised-2)',
                  border: `1px solid ${world === w.value ? w.color : 'var(--edge)'}`,
                  color: world === w.value ? w.color : 'var(--ink-dim)',
                }}
              >{w.label}</button>
            ))}

            <button
              onClick={save}
              disabled={!content.trim() || saving}
              style={{
                marginLeft: 'auto', padding: '6px 18px', borderRadius: 'var(--radius-sm)',
                background: content.trim() ? 'var(--c-dash-dim)' : 'var(--bg-raised-2)',
                border: `1px solid ${content.trim() ? 'var(--c-dash)' : 'var(--edge)'}`,
                color: content.trim() ? 'var(--c-dash)' : 'var(--ink-faint)',
                fontFamily: 'var(--body)', fontSize: 13, fontWeight: 600,
                cursor: content.trim() ? 'pointer' : 'not-allowed', transition: 'all .15s',
              }}
            >{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>

        {/* Unread notes */}
        {unread.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 10 }}>
              Pending · {unread.length}
            </div>
            {unread.map(note => {
              const w = worldInfo(note.world)
              return (
                <div key={note.id} style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                  borderLeft: `3px solid ${w.color}`, borderRadius: 'var(--radius)',
                  padding: '14px 16px', marginBottom: 8,
                }}>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    {note.world && (
                      <span style={{ fontSize: 11, color: w.color, fontWeight: 500 }}>{w.label}</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 'auto' }}>
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Read notes */}
        {read.length > 0 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginBottom: 10 }}>
              Read by iClaude · {read.length}
            </div>
            {read.map(note => {
              const w = worldInfo(note.world)
              return (
                <div key={note.id} style={{
                  background: 'var(--bg-inset)', border: '1px solid var(--edge-soft)',
                  borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 6,
                  opacity: 0.6,
                }}>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-dim)', whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                    {note.world && (
                      <span style={{ fontSize: 10, color: w.color }}>{w.label}</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 'auto' }}>
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ink-faint)', marginTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <div style={{ fontSize: 13 }}>No notes yet — capture something above</div>
          </div>
        )}
      </div>
    </div>
  )
}

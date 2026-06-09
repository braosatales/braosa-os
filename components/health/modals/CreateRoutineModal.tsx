'use client'
import { useState } from 'react'
import { Modal, Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { DAY_META, DayOfWeek } from '@/lib/health'

const DAYS: DayOfWeek[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateRoutineModal({ open, onClose, onCreated }: Props) {
  useLang()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetDays, setTargetDays] = useState<DayOfWeek[]>([])
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(day: DayOfWeek) {
    setTargetDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/health/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          target_days: targetDays,
          estimated_duration: duration ? parseInt(duration) : null,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Error')
      } else {
        setName('')
        setDescription('')
        setTargetDays([])
        setDuration('')
        onCreated()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Nova Rotina', 'New Routine')}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 500 }}>{L('Nome', 'Name')} *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={L('Ex: Peito e Tríceps', 'E.g. Push Day')}
              required
              className="glow-focus"
              style={{
                '--accent': 'var(--c-health)',
                background: 'var(--bg-inset)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)',
                padding: '9px 12px',
                fontSize: 14,
                color: 'var(--ink)',
                outline: 'none',
                width: '100%',
              } as React.CSSProperties}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 500 }}>{L('Descrição', 'Description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="glow-focus"
              style={{
                '--accent': 'var(--c-health)',
                background: 'var(--bg-inset)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)',
                padding: '9px 12px',
                fontSize: 13,
                color: 'var(--ink)',
                outline: 'none',
                resize: 'vertical',
                width: '100%',
                fontFamily: 'inherit',
              } as React.CSSProperties}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 500 }}>{L('Dias', 'Days')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAYS.map(day => {
                const active = targetDays.includes(day)
                const meta = DAY_META[day]
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={{
                      flex: 1,
                      padding: '6px 2px',
                      borderRadius: 8,
                      border: `1px solid ${active ? 'var(--c-health)' : 'var(--edge)'}`,
                      background: active ? 'color-mix(in oklch, var(--c-health) 18%, transparent)' : 'var(--bg-raised-2)',
                      color: active ? 'var(--c-health)' : 'var(--ink-faint)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {L(meta.label_pt, meta.label_en)}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 500 }}>{L('Duração estimada', 'Estimated duration')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                min={1}
                max={300}
                placeholder="60"
                className="glow-focus"
                style={{
                  '--accent': 'var(--c-health)',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 12px',
                  fontSize: 14,
                  color: 'var(--ink)',
                  outline: 'none',
                  width: 80,
                } as React.CSSProperties}
              />
              <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>min</span>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--neg)', padding: '8px 12px', background: 'color-mix(in oklch, var(--neg) 12%, transparent)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>{L('Cancelar', 'Cancel')}</button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={saving || !name.trim()}
              style={{ '--accent': 'var(--c-health)' } as React.CSSProperties}
            >
              {saving ? L('A criar...', 'Creating...') : L('Criar', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

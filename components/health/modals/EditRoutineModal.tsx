'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { Routine, RoutineExercise, Exercise, MUSCLE_GROUP_META } from '@/lib/exercise'

type Props = {
  routine: Routine | null
  onClose: () => void
  onSaved: () => void
}

export default function EditRoutineModal({ routine, onClose, onSaved }: Props) {
  useLang()
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<RoutineExercise[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Exercise[]>([])
  const [searching, setSearching] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!routine) return
    setName(routine.name)
    fetch(`/api/health/routines/${routine.id}`)
      .then(r => r.json())
      .then(({ routine: r }) => {
        const sorted = (r?.routine_exercises ?? []).sort(
          (a: RoutineExercise, b: RoutineExercise) => a.order_index - b.order_index
        )
        setExercises(sorted)
      })
  }, [routine])

  const debounceSaveRoutine = useCallback((updatedName: string) => {
    if (!routine) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/health/routines/${routine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedName }),
      })
      onSaved()
    }, 1000)
  }, [routine, onSaved])

  const debounceSaveExercise = useCallback((ex: RoutineExercise) => {
    if (!routine) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/health/routines/${routine.id}/exercises/${ex.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets: ex.sets, reps: ex.reps, duration_seconds: ex.duration_seconds, rest_seconds: ex.rest_seconds }),
      })
    }, 1000)
  }, [routine])

  async function handleSearch(q: string) {
    setSearchQ(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/health/exercises?search=${encodeURIComponent(q)}`)
      const { exercises: results } = await res.json()
      setSearchResults(results ?? [])
    } finally {
      setSearching(false)
    }
  }

  async function handleAddExercise(ex: Exercise) {
    if (!routine) return
    const order_index = exercises.length
    const res = await fetch(`/api/health/routines/${routine.id}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: ex.id, order_index, sets: 3, reps: 10, rest_seconds: 60 }),
    })
    const { exercise: added } = await res.json()
    if (added) setExercises(prev => [...prev, added])
    setSearchQ('')
    setSearchResults([])
  }

  async function handleRemoveExercise(exId: string) {
    if (!routine) return
    const ex = exercises.find(e => e.id === exId)
    if (!ex) return
    setExercises(prev => prev.filter(e => e.id !== exId))
    await fetch(`/api/health/routines/${routine.id}/exercises/${exId}`, { method: 'DELETE' })
  }

  function updateExercise(id: string, updates: Partial<RoutineExercise>) {
    setExercises(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e)
      const changed = updated.find(e => e.id === id)
      if (changed) debounceSaveExercise(changed)
      return updated
    })
  }

  async function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) return
    const reordered = [...exercises]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    const withIndexes = reordered.map((e, i) => ({ ...e, order_index: i }))
    setExercises(withIndexes)
    setDragIndex(null)
    setDragOverIndex(null)
    if (!routine) return
    await fetch(`/api/health/routines/${routine.id}/exercises`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercises: withIndexes.map(e => ({ id: e.id, order_index: e.order_index })) }),
    })
  }

  if (!routine) return null

  return (
    <Modal open={!!routine} onClose={onClose} width={680}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <input
            value={name}
            onChange={e => { setName(e.target.value); debounceSaveRoutine(e.target.value) }}
            className="glow-focus"
            style={{
              '--accent': 'var(--c-health)',
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ink)',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 8,
              padding: '4px 8px',
              outline: 'none',
              flex: 1,
            } as React.CSSProperties}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', marginLeft: 12 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, minHeight: 40 }}>
          {exercises.length === 0 && (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
              {L('Sem exercícios. Adiciona abaixo.', 'No exercises. Add below.')}
            </div>
          )}
          {exercises.map((ex, i) => {
            const primaryMeta = ex.exercise?.muscle_groups?.[0] ? MUSCLE_GROUP_META[ex.exercise.muscle_groups[0]] : null
            const isDragging = dragIndex === i
            const isOver = dragOverIndex === i
            return (
              <div
                key={ex.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: isDragging ? 'var(--bg-raised-2)' : isOver ? 'color-mix(in oklch, var(--c-health) 8%, var(--bg-raised))' : 'transparent',
                  border: `1px solid ${isOver ? 'var(--c-health)' : 'transparent'}`,
                  opacity: isDragging ? 0.5 : 1,
                  transition: 'background .1s, border-color .1s',
                }}
              >
                <span style={{ cursor: 'grab', color: 'var(--ink-faint)', fontSize: 14, lineHeight: 1 }}>⠿</span>

                {primaryMeta && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: primaryMeta.color, flexShrink: 0 }} />
                )}

                <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex.exercise ? L(ex.exercise.name_pt ?? ex.exercise.name, ex.exercise.name) : ''}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <input
                    type="number"
                    value={ex.sets}
                    min={1}
                    max={20}
                    onChange={e => updateExercise(ex.id, { sets: parseInt(e.target.value) || 1 })}
                    style={{ width: 36, background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 6, padding: '3px 5px', fontSize: 12, color: 'var(--ink)', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>×</span>
                  {ex.duration_seconds !== null ? (
                    <>
                      <input
                        type="number"
                        value={ex.duration_seconds ?? 0}
                        min={0}
                        onChange={e => updateExercise(ex.id, { duration_seconds: parseInt(e.target.value) || 0 })}
                        style={{ width: 44, background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 6, padding: '3px 5px', fontSize: 12, color: 'var(--ink)', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>s</span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        value={ex.reps ?? 10}
                        min={1}
                        max={200}
                        onChange={e => updateExercise(ex.id, { reps: parseInt(e.target.value) || 1 })}
                        style={{ width: 36, background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 6, padding: '3px 5px', fontSize: 12, color: 'var(--ink)', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>reps</span>
                    </>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>rest</span>
                  <input
                    type="number"
                    value={ex.rest_seconds}
                    min={0}
                    step={15}
                    onChange={e => updateExercise(ex.id, { rest_seconds: parseInt(e.target.value) || 0 })}
                    style={{ width: 44, background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 6, padding: '3px 5px', fontSize: 12, color: 'var(--ink)', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>s</span>
                </div>

                <button
                  onClick={() => handleRemoveExercise(ex.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', padding: 2, borderRadius: 4, flexShrink: 0 }}
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--edge-soft)', paddingTop: 16 }}>
          <div style={{ position: 'relative' }}>
            <input
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              placeholder={L('Adicionar exercício...', 'Add exercise...')}
              className="glow-focus"
              style={{
                '--accent': 'var(--c-health)',
                width: '100%',
                background: 'var(--bg-inset)',
                border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--ink)',
                outline: 'none',
              } as React.CSSProperties}
            />
            {searching && (
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }}>
                <Icon name="refresh" size={12} />
              </span>
            )}
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 4, background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius-sm)', maxHeight: 220, overflowY: 'auto' }}>
              {searchResults.map(ex => {
                const mg = ex.muscle_groups[0]
                const meta = mg ? MUSCLE_GROUP_META[mg] : null
                return (
                  <button
                    key={ex.id}
                    onClick={() => handleAddExercise(ex)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {meta && <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />}
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1 }}>
                      {L(ex.name_pt ?? ex.name, ex.name)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{ex.difficulty}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

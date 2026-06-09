'use client'
import { useState, useEffect, useCallback } from 'react'
import { Icon, EmptyState } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { Routine, Exercise, MUSCLE_GROUP_META } from '@/lib/exercise'
import { DAY_META, DayOfWeek } from '@/lib/health'
import CreateRoutineModal from '@/components/health/modals/CreateRoutineModal'
import EditRoutineModal from '@/components/health/modals/EditRoutineModal'
import ExerciseDetailModal from '@/components/health/modals/ExerciseDetailModal'

const DAYS: DayOfWeek[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

type MuscleFilter = 'all' | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'

const MUSCLE_FILTERS: { id: MuscleFilter; label_pt: string; label_en: string }[] = [
  { id: 'all',       label_pt: 'Todos',   label_en: 'All'       },
  { id: 'chest',     label_pt: 'Peito',   label_en: 'Chest'     },
  { id: 'back',      label_pt: 'Costas',  label_en: 'Back'      },
  { id: 'legs',      label_pt: 'Pernas',  label_en: 'Legs'      },
  { id: 'shoulders', label_pt: 'Ombros',  label_en: 'Shoulders' },
  { id: 'arms',      label_pt: 'Braços',  label_en: 'Arms'      },
  { id: 'core',      label_pt: 'Core',    label_en: 'Core'      },
  { id: 'cardio',    label_pt: 'Cardio',  label_en: 'Cardio'    },
]

type RoutineWithExercises = Routine & { routine_exercises?: { exercise: Exercise }[] }

export default function RoutinesView() {
  useLang()
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([])
  const [loadingRoutines, setLoadingRoutines] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)

  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)

  const fetchRoutines = useCallback(async () => {
    setLoadingRoutines(true)
    try {
      const res = await fetch('/api/health/routines')
      if (res.ok) {
        const { routines: data } = await res.json()
        setRoutines(data ?? [])
      }
    } finally {
      setLoadingRoutines(false)
    }
  }, [])

  useEffect(() => { fetchRoutines() }, [fetchRoutines])

  useEffect(() => {
    let params = ''
    if (muscleFilter === 'arms') {
      params = 'muscle_group=biceps'
    } else if (muscleFilter !== 'all') {
      params = `muscle_group=${muscleFilter}`
    }
    if (exerciseSearch) {
      params += `${params ? '&' : ''}search=${encodeURIComponent(exerciseSearch)}`
    }

    setLoadingExercises(true)
    fetch(`/api/health/exercises${params ? `?${params}` : ''}`)
      .then(r => r.json())
      .then(({ exercises: data }) => {
        let results: Exercise[] = data ?? []
        if (muscleFilter === 'arms') {
          results = results.filter(e =>
            e.muscle_groups.some(mg => mg === 'biceps' || mg === 'triceps')
          )
        }
        setExercises(results)
      })
      .finally(() => setLoadingExercises(false))
  }, [muscleFilter, exerciseSearch])

  async function handleDeleteRoutine(id: string) {
    if (!confirm(L('Apagar esta rotina?', 'Delete this routine?'))) return
    await fetch(`/api/health/routines/${id}`, { method: 'DELETE' })
    fetchRoutines()
  }

  return (
    <div className="ov-split" style={{ flex: 1, alignContent: 'start' }}>
      {/* Left: Routines list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Rotinas', 'Routines')}
          </span>
          <button
            className="btn btn-accent"
            onClick={() => setCreateOpen(true)}
            style={{ '--accent': 'var(--c-health)', fontSize: 13, padding: '7px 14px' } as React.CSSProperties}
          >
            <Icon name="plus" size={13} />
            {L('Nova Rotina', 'New Routine')}
          </button>
        </div>

        {loadingRoutines ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 90, borderRadius: 'var(--radius)', background: 'var(--bg-raised)', animation: 'skeleton-pulse 1.4s ease-in-out infinite alternate' }} />
            ))}
          </div>
        ) : routines.length === 0 ? (
          <EmptyState
            icon="list"
            title={L('Sem rotinas', 'No routines')}
            subtitle={L('Cria a tua primeira rotina de treino.', 'Create your first workout routine.')}
            action={{ label: L('Nova Rotina', 'New Routine'), onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {routines.map(routine => {
              const exCount = routine.routine_exercises?.length ?? 0
              return (
                <div
                  key={routine.id}
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--edge)',
                    borderRadius: 'var(--radius)',
                    padding: '18px 20px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {routine.name}
                    </span>
                    {routine.estimated_duration && (
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', padding: '2px 8px', background: 'var(--bg-raised-2)', borderRadius: 99, border: '1px solid var(--edge)' }}>
                        {routine.estimated_duration} min
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {DAYS.map(day => {
                      const active = routine.target_days.includes(day)
                      const meta = DAY_META[day]
                      return (
                        <span
                          key={day}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '3px 2px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            background: active ? 'color-mix(in oklch, var(--c-health) 18%, transparent)' : 'var(--bg-raised-2)',
                            color: active ? 'var(--c-health)' : 'var(--ink-faint)',
                            border: `1px solid ${active ? 'var(--c-health)' : 'var(--edge-soft)'}`,
                          }}
                        >
                          {L(meta.label_pt, meta.label_en)}
                        </span>
                      )
                    })}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: routine.description ? 6 : 10 }}>
                    {exCount} {L('exercício(s)', 'exercise(s)')}
                  </div>

                  {routine.description && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                      {routine.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      className="btn"
                      onClick={() => setEditRoutine(routine)}
                      style={{ fontSize: 12, padding: '5px 12px' }}
                    >
                      {L('Editar', 'Edit')}
                    </button>
                    <button
                      className="btn btn-accent"
                      style={{ '--accent': 'var(--c-health)', fontSize: 12, padding: '5px 12px' } as React.CSSProperties}
                    >
                      <Icon name="flame" size={12} />
                      {L('Treinar', 'Start Workout')}
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleDeleteRoutine(routine.id)}
                      style={{ fontSize: 12, padding: '5px 10px', marginLeft: 'auto', color: 'var(--neg)' }}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: Exercise browser */}
      <div className="fin-rail" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {L('Exercícios', 'Exercises')}
        </span>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {MUSCLE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setMuscleFilter(f.id)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 99,
                border: `1px solid ${muscleFilter === f.id ? 'var(--c-health)' : 'var(--edge)'}`,
                background: muscleFilter === f.id ? 'color-mix(in oklch, var(--c-health) 16%, transparent)' : 'var(--bg-raised-2)',
                color: muscleFilter === f.id ? 'var(--c-health)' : 'var(--ink-dim)',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {L(f.label_pt, f.label_en)}
            </button>
          ))}
        </div>

        <input
          value={exerciseSearch}
          onChange={e => setExerciseSearch(e.target.value)}
          placeholder={L('Pesquisar...', 'Search...')}
          className="glow-focus"
          style={{
            '--accent': 'var(--c-health)',
            background: 'var(--bg-inset)',
            border: '1px solid var(--edge)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--ink)',
            outline: 'none',
            width: '100%',
          } as React.CSSProperties}
        />

        <div style={{ overflowY: 'auto', maxHeight: 480, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loadingExercises ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ height: 36, borderRadius: 8, background: 'var(--bg-raised-2)', animation: 'skeleton-pulse 1.4s ease-in-out infinite alternate' }} />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)' }}>
              {L('Nenhum exercício encontrado', 'No exercises found')}
            </div>
          ) : exercises.map(ex => {
            const primaryGroup = ex.muscle_groups[0]
            const meta = primaryGroup ? MUSCLE_GROUP_META[primaryGroup] : null
            return (
              <button
                key={ex.id}
                onClick={() => setDetailExercise(ex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {meta && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {L(ex.name_pt ?? ex.name, ex.name)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', padding: '1px 6px', background: 'var(--bg-raised-2)', borderRadius: 99, border: '1px solid var(--edge-soft)', flexShrink: 0 }}>
                  {ex.type}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>
                  {ex.difficulty === 'beginner' ? '●' : ex.difficulty === 'intermediate' ? '●●' : '●●●'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <CreateRoutineModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchRoutines}
      />

      <EditRoutineModal
        routine={editRoutine}
        onClose={() => setEditRoutine(null)}
        onSaved={fetchRoutines}
      />

      <ExerciseDetailModal
        exercise={detailExercise}
        routines={routines}
        onClose={() => setDetailExercise(null)}
      />
    </div>
  )
}

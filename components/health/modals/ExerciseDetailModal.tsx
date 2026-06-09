'use client'
import { useState, useEffect } from 'react'
import { Modal, Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { Exercise, Routine, MUSCLE_GROUP_META } from '@/lib/exercise'
import { searchExerciseVideo } from '@/lib/youtube'

type Props = {
  exercise: Exercise | null
  routines: Routine[]
  onClose: () => void
}

export default function ExerciseDetailModal({ exercise, routines, onClose }: Props) {
  useLang()
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addDone, setAddDone] = useState(false)

  useEffect(() => {
    if (!exercise) return
    setVideoId(null)
    setVideoTitle(null)
    setAddDone(false)
    setSelectedRoutineId(routines[0]?.id ?? '')

    fetch(`/api/health/videos?exercise_id=${exercise.id}`)
      .then(r => r.json())
      .then(({ video }) => {
        if (video?.youtube_video_id) {
          setVideoId(video.youtube_video_id)
          setVideoTitle(video.youtube_title ?? null)
        }
      })
  }, [exercise, routines])

  async function handleFindVideo() {
    if (!exercise?.youtube_search_query) return
    setVideoLoading(true)
    const result = await searchExerciseVideo(exercise.youtube_search_query)
    if (result) {
      setVideoId(result.videoId)
      setVideoTitle(result.title)
    }
    setVideoLoading(false)
  }

  async function handleFavourite() {
    if (!exercise || !videoId) return
    await fetch('/api/health/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: exercise.id, youtube_video_id: videoId, youtube_title: videoTitle, status: 'favourite' }),
    })
  }

  async function handleFlag() {
    if (!exercise || !videoId) return
    await fetch('/api/health/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: exercise.id, youtube_video_id: videoId, youtube_title: videoTitle, status: 'flagged' }),
    })
    setVideoId(null)
    setVideoTitle(null)
    if (exercise.youtube_search_query) {
      setVideoLoading(true)
      const result = await searchExerciseVideo(exercise.youtube_search_query)
      if (result) { setVideoId(result.videoId); setVideoTitle(result.title) }
      setVideoLoading(false)
    }
  }

  async function handleAddToRoutine() {
    if (!exercise || !selectedRoutineId) return
    setAdding(true)
    await fetch(`/api/health/routines/${selectedRoutineId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: exercise.id, sets: 3, reps: 10, rest_seconds: 60 }),
    })
    setAdding(false)
    setAddDone(true)
    setTimeout(() => setAddDone(false), 2000)
  }

  if (!exercise) return null

  const primaryGroup = exercise.muscle_groups[0]
  const primaryMeta = primaryGroup ? MUSCLE_GROUP_META[primaryGroup] : null

  return (
    <Modal open={!!exercise} onClose={onClose} width={560}>
      <div style={{ padding: '24px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
              {L(exercise.name_pt ?? exercise.name, exercise.name)}
            </div>
            {exercise.name_pt && (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{exercise.name}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', flexShrink: 0, marginTop: 2 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {exercise.muscle_groups.map(mg => {
            const meta = MUSCLE_GROUP_META[mg]
            if (!meta) return null
            return (
              <span key={mg} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: `color-mix(in oklch, ${meta.color} 18%, transparent)`,
                color: meta.color, border: `1px solid color-mix(in oklch, ${meta.color} 35%, transparent)`,
              }}>
                {L(meta.label_pt, meta.label_en)}
              </span>
            )
          })}
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'var(--bg-raised-2)', color: 'var(--ink-dim)', border: '1px solid var(--edge)' }}>
            {exercise.type}
          </span>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'var(--bg-raised-2)', color: 'var(--ink-dim)', border: '1px solid var(--edge)' }}>
            {exercise.difficulty}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          {videoId ? (
            <div>
              <iframe
                width="100%"
                style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-sm)', border: 'none', display: 'block' }}
                src={`https://www.youtube.com/embed/${videoId}`}
                allowFullScreen
                title={videoTitle ?? exercise.name}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={handleFavourite}
                  className="btn"
                  style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
                >
                  <span>❤️</span> {L('Favorito', 'Favourite')}
                </button>
                <button
                  onClick={handleFlag}
                  className="btn"
                  style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
                >
                  <span>🚩</span> {L('Reportar', 'Flag')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleFindVideo}
              disabled={videoLoading}
              className="btn"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 13, color: primaryMeta ? primaryMeta.color : 'var(--ink-soft)' }}
            >
              {videoLoading ? (
                <><Icon name="refresh" size={14} /> {L('A procurar...', 'Searching...')}</>
              ) : (
                <><Icon name="eye" size={14} /> {L('Procurar vídeo', 'Find video')}</>
              )}
            </button>
          )}
        </div>

        {exercise.instructions && (
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6, marginBottom: 16 }}>
            {exercise.instructions}
          </div>
        )}

        {routines.length > 0 && (
          <div style={{ borderTop: '1px solid var(--edge-soft)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 500, marginBottom: 10 }}>
              {L('Adicionar à Rotina', 'Add to Routine')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={selectedRoutineId}
                onChange={e => setSelectedRoutineId(e.target.value)}
                className="glow-focus"
                style={{
                  '--accent': 'var(--c-health)',
                  flex: 1,
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--ink)',
                  outline: 'none',
                } as React.CSSProperties}
              >
                {routines.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                className="btn btn-accent"
                onClick={handleAddToRoutine}
                disabled={adding || !selectedRoutineId}
                style={{ '--accent': 'var(--c-health)', fontSize: 13, padding: '8px 16px' } as React.CSSProperties}
              >
                {addDone ? L('Adicionado!', 'Added!') : adding ? '...' : L('Adicionar', 'Add')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

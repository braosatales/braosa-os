'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon, Ring, Modal, EmptyState } from '@/components/ui'
import { useLang, L, getLang } from '@/lib/i18n'
import { PlannedSession, SESSION_TYPE_META } from '@/lib/journey'
import { Routine, RoutineExercise } from '@/lib/exercise'
import { ActiveWorkout, ActiveExercise, SessionSet } from '@/lib/workout-session'
import { burstConfetti } from '@/lib/confetti'
import { useHealth } from '@/components/health/HealthShell'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

// ─── Types ───────────────────────────────────────────────────────────────────

type LocalSetRow = {
  localId: string
  set_number: number
  weight_kg: string
  reps: string
  completed: boolean
  is_pr: boolean
  savedId?: string
}

type SpotifyState = {
  connected: boolean
  isPlaying: boolean
  trackName: string | null
  artistName: string | null
  albumArt: string | null
  displayName: string | null
}

type VideoState = {
  show: boolean
  videoId: string | null
  title: string | null
  loading: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatPrevHistory(sets: Pick<SessionSet, 'weight_kg' | 'reps' | 'duration_seconds'>[]): string {
  return sets.slice(0, 4).map(s => {
    if (s.weight_kg && s.reps) return `${s.weight_kg}kg × ${s.reps}`
    if (s.reps) return `${s.reps} reps`
    if (s.duration_seconds) return `${s.duration_seconds}s`
    return '—'
  }).join(' | ')
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    gain.connect(ctx.destination)
    const osc = ctx.createOscillator()
    osc.connect(gain); osc.frequency.value = 440
    osc.start(); osc.stop(ctx.currentTime + 0.1)
    setTimeout(() => {
      const o2 = ctx.createOscillator(); o2.connect(gain)
      o2.frequency.value = 440; o2.start(); o2.stop(ctx.currentTime + 0.1)
    }, 150)
    setTimeout(() => {
      const o3 = ctx.createOscillator(); o3.connect(gain)
      o3.frequency.value = 523; o3.start(); o3.stop(ctx.currentTime + 0.15)
    }, 300)
  } catch { /* ignore */ }
}

function buildExercisesFromPlan(planSession: PlannedSession): ActiveExercise[] {
  return planSession.exercises.map(ex => ({
    exercise_id: ex.exercise_id,
    exercise_name: ex.name,
    exercise_name_pt: ex.name_pt,
    sets: [],
    target_sets: ex.sets,
    target_reps: ex.reps,
    target_duration_seconds: ex.duration_seconds,
    target_rest_seconds: ex.rest_seconds,
    notes: ex.notes,
    youtube_video_id: null,
    youtube_title: null,
  }))
}

function initLocalSets(exercises: ActiveExercise[]): Record<string, LocalSetRow[]> {
  const map: Record<string, LocalSetRow[]> = {}
  for (const ex of exercises) {
    map[ex.exercise_id] = Array.from({ length: Math.max(ex.target_sets, 1) }, (_, i) => ({
      localId: `${ex.exercise_id}-init-${i}-${Date.now()}`,
      set_number: i + 1,
      weight_kg: '',
      reps: ex.target_reps != null ? String(ex.target_reps) : '',
      completed: false,
      is_pr: false,
    }))
  }
  return map
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutView() {
  useLang()
  const isMobile = useIsMobile()
  const { pendingSession, pendingRoutineId, clearPending, navigateTo } = useHealth()

  // No-session state
  const [todayPlan, setTodayPlan] = useState<PlannedSession | null>(null)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null)
  const [loadingStart, setLoadingStart] = useState(false)
  const [spotify, setSpotify] = useState<SpotifyState>({
    connected: false, isPlaying: false,
    trackName: null, artistName: null, albumArt: null, displayName: null,
  })

  // Active session state
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  const [localSets, setLocalSets] = useState<Record<string, LocalSetRow[]>>({})
  const [prevHistory, setPrevHistory] = useState<Record<string, Pick<SessionSet, 'weight_kg' | 'reps' | 'duration_seconds'>[]>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restTotal, setRestTotal] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restTimerActive, setRestTimerActive] = useState(false)
  const [videoStates, setVideoStates] = useState<Record<string, VideoState>>({})
  const [showFinish, setShowFinish] = useState(false)
  const [finishFeedback, setFinishFeedback] = useState<string | null>(null)
  const [finishNotes, setFinishNotes] = useState('')
  const [savingFinish, setSavingFinish] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; name_pt: string | null; type: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const spotifyRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingHandled = useRef(false)

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/health/plans').then(r => r.json()).then(({ plans }) => {
      const today = new Date().toISOString().split('T')[0]
      let found: PlannedSession | null = null
      for (const p of (plans ?? [])) {
        const s = (p.planned_sessions ?? []).find((s: PlannedSession) => s.session_date === today && s.status === 'pending')
        if (s) { found = s; break }
      }
      setTodayPlan(found)
    }).catch(() => {})

    fetch('/api/health/routines').then(r => r.json()).then(({ routines: data }) => {
      setRoutines(data ?? [])
    }).catch(() => {})

    fetch('/api/spotify/player').then(r => r.json()).then(data => {
      if (data.connected) {
        setSpotify(prev => ({ ...prev, connected: true, ...data }))
      }
    }).catch(() => {})
  }, [])

  // Handle pending session from HealthContext
  useEffect(() => {
    if (pendingHandled.current || activeWorkout) return
    if (pendingSession) {
      pendingHandled.current = true
      void doStartFromPlan(pendingSession)
    } else if (pendingRoutineId) {
      pendingHandled.current = true
      void doStartFromRoutine(pendingRoutineId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSession, pendingRoutineId])

  // Elapsed timer
  useEffect(() => {
    if (!activeWorkout) return
    elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.session.id])

  // Rest timer
  useEffect(() => {
    if (!restTimerActive) {
      if (restRef.current) clearInterval(restRef.current)
      return
    }
    restRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) {
          clearInterval(restRef.current!)
          setRestTimerActive(false)
          playBeep()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (restRef.current) clearInterval(restRef.current) }
  }, [restTimerActive])

  // Spotify polling during active session
  useEffect(() => {
    if (!activeWorkout || !spotify.connected) return
    spotifyRef.current = setInterval(() => {
      fetch('/api/spotify/player').then(r => r.json()).then(data => {
        setSpotify(prev => ({ ...prev, ...data }))
      }).catch(() => {})
    }, 5000)
    return () => { if (spotifyRef.current) clearInterval(spotifyRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.session.id, spotify.connected])

  // Exercise search
  useEffect(() => {
    if (!showAddExercise) return
    setSearchLoading(true)
    const q = exerciseSearch.trim()
    const url = q ? `/api/health/exercises?search=${encodeURIComponent(q)}` : '/api/health/exercises'
    fetch(url).then(r => r.json()).then(({ exercises }) => {
      setSearchResults(exercises ?? [])
    }).finally(() => setSearchLoading(false))
  }, [exerciseSearch, showAddExercise])

  // ─── Session starters ─────────────────────────────────────────────────────

  async function doStartFromPlan(planSession: PlannedSession) {
    setLoadingStart(true)
    try {
      const res = await fetch('/api/health/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planSession.session_name,
          session_type: planSession.session_type,
          planned_session_id: planSession.id,
          routine_id: null,
        }),
      })
      const { session } = await res.json()
      const exercises = buildExercisesFromPlan(planSession)
      setActiveWorkout({ session, exercises, currentExerciseIndex: 0, elapsedSeconds: 0 })
      setLocalSets(initLocalSets(exercises))
      setElapsedSeconds(0)
      fetchAllHistory(exercises)
    } finally {
      setLoadingStart(false)
      clearPending()
    }
  }

  async function doStartFromRoutine(routineId: string) {
    setLoadingStart(true)
    try {
      const res = await fetch(`/api/health/routines/${routineId}`)
      const { routine } = await res.json()
      const exs: ActiveExercise[] = (routine.routine_exercises ?? [])
        .sort((a: RoutineExercise, b: RoutineExercise) => a.order_index - b.order_index)
        .map((re: RoutineExercise) => ({
          exercise_id: re.exercise_id,
          exercise_name: re.exercise?.name ?? 'Exercise',
          exercise_name_pt: re.exercise?.name_pt ?? null,
          sets: [],
          target_sets: re.sets,
          target_reps: re.reps,
          target_duration_seconds: re.duration_seconds,
          target_rest_seconds: re.rest_seconds,
          notes: re.notes,
          youtube_video_id: null,
          youtube_title: null,
        }))

      const sessionRes = await fetch('/api/health/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routine.name,
          session_type: 'strength',
          planned_session_id: null,
          routine_id: routineId,
        }),
      })
      const { session } = await sessionRes.json()
      setActiveWorkout({ session, exercises: exs, currentExerciseIndex: 0, elapsedSeconds: 0 })
      setLocalSets(initLocalSets(exs))
      setElapsedSeconds(0)
      fetchAllHistory(exs)
    } finally {
      setLoadingStart(false)
      clearPending()
    }
  }

  async function doStartFree() {
    setLoadingStart(true)
    try {
      const res = await fetch('/api/health/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: L('Treino Livre', 'Free Workout'),
          session_type: 'strength',
          planned_session_id: null,
          routine_id: null,
        }),
      })
      const { session } = await res.json()
      setActiveWorkout({ session, exercises: [], currentExerciseIndex: 0, elapsedSeconds: 0 })
      setLocalSets({})
      setElapsedSeconds(0)
    } finally {
      setLoadingStart(false)
    }
  }

  function fetchAllHistory(exercises: ActiveExercise[]) {
    for (const ex of exercises) {
      fetch(`/api/health/exercises/${ex.exercise_id}/history`)
        .then(r => r.json())
        .then(({ sets }) => {
          setPrevHistory(prev => ({ ...prev, [ex.exercise_id]: sets ?? [] }))
        })
        .catch(() => {})
    }
  }

  // ─── Set management ───────────────────────────────────────────────────────

  function updateSetField(exerciseId: string, localId: string, field: 'weight_kg' | 'reps', value: string) {
    setLocalSets(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map(r => r.localId === localId ? { ...r, [field]: value } : r),
    }))
  }

  function addSetRow(exerciseId: string) {
    setLocalSets(prev => {
      const rows = prev[exerciseId] ?? []
      const nextNum = rows.length + 1
      const ex = activeWorkout?.exercises.find(e => e.exercise_id === exerciseId)
      return {
        ...prev,
        [exerciseId]: [...rows, {
          localId: `${exerciseId}-add-${Date.now()}`,
          set_number: nextNum,
          weight_kg: '',
          reps: ex?.target_reps != null ? String(ex.target_reps) : '',
          completed: false,
          is_pr: false,
        }],
      }
    })
  }

  async function handleCompleteSet(exerciseId: string, localId: string, btnEl: HTMLElement | null) {
    if (!activeWorkout) return
    const rows = localSets[exerciseId] ?? []
    const row = rows.find(r => r.localId === localId)
    if (!row || row.completed) return

    const ex = activeWorkout.exercises.find(e => e.exercise_id === exerciseId)

    const res = await fetch(`/api/health/sessions/${activeWorkout.session.id}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_id: exerciseId,
        exercise_name: ex?.exercise_name ?? '',
        set_number: row.set_number,
        reps: row.reps ? parseInt(row.reps) : null,
        weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : null,
        completed: true,
      }),
    })
    const data = await res.json()
    const is_pr: boolean = data.is_pr ?? false
    const savedSet: SessionSet = data.set

    setLocalSets(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map(r =>
        r.localId === localId ? { ...r, completed: true, is_pr, savedId: savedSet?.id } : r
      ),
    }))

    setActiveWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(e =>
          e.exercise_id === exerciseId ? { ...e, sets: [...e.sets, savedSet] } : e
        ),
      }
    })

    if (is_pr && btnEl) {
      const rect = btnEl.getBoundingClientRect()
      burstConfetti(rect.x + rect.width / 2, rect.y + rect.height / 2)
    }

    if (ex && ex.target_rest_seconds > 0) {
      setRestTotal(ex.target_rest_seconds)
      setRestRemaining(ex.target_rest_seconds)
      setRestTimerActive(true)
    }
  }

  // ─── Video ────────────────────────────────────────────────────────────────

  async function toggleVideo(exerciseId: string, exerciseName: string) {
    const cur = videoStates[exerciseId]
    if (cur?.show) {
      setVideoStates(prev => ({ ...prev, [exerciseId]: { ...prev[exerciseId], show: false } }))
      return
    }
    if (cur?.videoId) {
      setVideoStates(prev => ({ ...prev, [exerciseId]: { ...prev[exerciseId], show: true } }))
      return
    }
    setVideoStates(prev => ({ ...prev, [exerciseId]: { show: true, videoId: null, title: null, loading: true } }))

    // Try saved preference first
    const prefRes = await fetch(`/api/health/videos?exercise_id=${exerciseId}`)
    const { video: pref } = await prefRes.json()
    if (pref?.youtube_video_id) {
      setVideoStates(prev => ({ ...prev, [exerciseId]: { show: true, videoId: pref.youtube_video_id, title: pref.youtube_title, loading: false } }))
      return
    }

    // Search YouTube
    const q = encodeURIComponent(exerciseName + ' exercise tutorial')
    const searchRes = await fetch(`/api/health/youtube-search?q=${q}`)
    const { videos } = await searchRes.json()
    if (videos?.[0]) {
      setVideoStates(prev => ({ ...prev, [exerciseId]: { show: true, videoId: videos[0].videoId, title: videos[0].title, loading: false } }))
    } else {
      setVideoStates(prev => ({ ...prev, [exerciseId]: { show: true, videoId: null, title: null, loading: false } }))
    }
  }

  async function handleVideoAction(exerciseId: string, action: 'favourite' | 'flagged') {
    const vs = videoStates[exerciseId]
    if (!vs?.videoId) return
    await fetch('/api/health/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: exerciseId, youtube_video_id: vs.videoId, youtube_title: vs.title, status: action }),
    })
    if (action === 'flagged') {
      // Load next video
      setVideoStates(prev => ({ ...prev, [exerciseId]: { ...prev[exerciseId], videoId: null, title: null, loading: true } }))
      const ex = activeWorkout?.exercises.find(e => e.exercise_id === exerciseId)
      const q = encodeURIComponent((ex?.exercise_name ?? '') + ' exercise tutorial')
      const searchRes = await fetch(`/api/health/youtube-search?q=${q}`)
      const { videos } = await searchRes.json()
      const next = videos?.find((v: { videoId: string }) => v.videoId !== vs.videoId)
      setVideoStates(prev => ({
        ...prev,
        [exerciseId]: { show: true, videoId: next?.videoId ?? null, title: next?.title ?? null, loading: false },
      }))
    }
  }

  // ─── Spotify ──────────────────────────────────────────────────────────────

  async function handleSpotifyControl(action: 'play' | 'pause' | 'next' | 'previous') {
    await fetch('/api/spotify/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setTimeout(() => {
      fetch('/api/spotify/player').then(r => r.json()).then(data => {
        setSpotify(prev => ({ ...prev, ...data }))
      }).catch(() => {})
    }, 500)
  }

  // ─── Add exercise ─────────────────────────────────────────────────────────

  function handleAddExercise(ex: { id: string; name: string; name_pt: string | null }) {
    if (!activeWorkout) return
    const newEx: ActiveExercise = {
      exercise_id: ex.id,
      exercise_name: ex.name,
      exercise_name_pt: ex.name_pt,
      sets: [],
      target_sets: 3,
      target_reps: 10,
      target_duration_seconds: null,
      target_rest_seconds: 60,
      notes: null,
      youtube_video_id: null,
      youtube_title: null,
    }
    setActiveWorkout(prev => prev ? { ...prev, exercises: [...prev.exercises, newEx] } : prev)
    setLocalSets(prev => ({
      ...prev,
      [ex.id]: Array.from({ length: 3 }, (_, i) => ({
        localId: `${ex.id}-add-${Date.now()}-${i}`,
        set_number: i + 1,
        weight_kg: '',
        reps: '10',
        completed: false,
        is_pr: false,
      })),
    }))
    fetch(`/api/health/exercises/${ex.id}/history`)
      .then(r => r.json())
      .then(({ sets }) => setPrevHistory(prev => ({ ...prev, [ex.id]: sets ?? [] })))
      .catch(() => {})
    setShowAddExercise(false)
    setExerciseSearch('')
  }

  // ─── Finish ───────────────────────────────────────────────────────────────

  async function handleFinish() {
    if (!activeWorkout || savingFinish) return
    setSavingFinish(true)
    try {
      const now = new Date().toISOString()
      await fetch(`/api/health/sessions/${activeWorkout.session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: now,
          duration_seconds: elapsedSeconds,
          notes: finishNotes || null,
          feedback: finishFeedback || null,
        }),
      })
      if (activeWorkout.session.planned_session_id) {
        const planId = (pendingSession as PlannedSession | null)?.plan_id
          ?? activeWorkout.session.planned_session_id
        await fetch(`/api/health/plans/${planId}/sessions/${activeWorkout.session.planned_session_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }).catch(() => {})
      }
      burstConfetti(window.innerWidth / 2, window.innerHeight / 3)
      setActiveWorkout(null)
      setLocalSets({})
      setElapsedSeconds(0)
      setShowFinish(false)
      setFinishFeedback(null)
      setFinishNotes('')
      navigateTo('history')
    } finally {
      setSavingFinish(false)
    }
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const totalSetsCompleted = activeWorkout
    ? Object.values(localSets).flat().filter(r => r.completed).length
    : 0

  // ─── Render: no active session ────────────────────────────────────────────

  if (!activeWorkout) {
    return (
      <div style={{ padding: 24, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
          {L('Treinar', 'Workout')}
        </div>

        {/* Start option cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {/* Today's Plan */}
          <div
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)', padding: 20, cursor: todayPlan ? 'pointer' : 'default',
              transition: 'border-color .15s',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
            onMouseEnter={e => { if (todayPlan) (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-health)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--edge)' }}
          >
            <span style={{ color: 'var(--c-health)' }}><Icon name="target" size={20} /></span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
              {L('Plano de Hoje', "Today's Plan")}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-dim)', flex: 1 }}>
              {todayPlan
                ? todayPlan.session_name
                : L('Sem plano hoje', 'No plan today')}
            </div>
            <button
              className="btn btn-accent"
              disabled={!todayPlan || loadingStart}
              onClick={() => todayPlan && doStartFromPlan(todayPlan)}
              style={{
                '--accent': 'var(--c-health)',
                fontSize: 12, padding: '6px 12px',
                opacity: todayPlan ? 1 : 0.4,
              } as React.CSSProperties}
            >
              {L('Iniciar', 'Start')}
            </button>
          </div>

          {/* Choose Routine */}
          <div
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <span style={{ color: 'var(--c-task)' }}><Icon name="list" size={20} /></span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
              {L('Escolher Rotina', 'Choose Routine')}
            </div>
            <select
              value={selectedRoutineId ?? ''}
              onChange={e => setSelectedRoutineId(e.target.value || null)}
              style={{
                background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)', padding: '6px 8px',
                fontSize: 12, color: 'var(--ink)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">{L('Selecionar...', 'Select...')}</option>
              {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button
              className="btn btn-accent"
              disabled={!selectedRoutineId || loadingStart}
              onClick={() => selectedRoutineId && doStartFromRoutine(selectedRoutineId)}
              style={{
                '--accent': 'var(--c-task)',
                fontSize: 12, padding: '6px 12px',
                opacity: selectedRoutineId ? 1 : 0.4,
              } as React.CSSProperties}
            >
              {L('Começar', 'Start')}
            </button>
          </div>

          {/* Free Workout */}
          <div
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius)', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 10,
              cursor: 'pointer', transition: 'border-color .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-dash)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--edge)')}
          >
            <span style={{ color: 'var(--c-dash)' }}><Icon name="activity" size={20} /></span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
              {L('Treino Livre', 'Free Workout')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-dim)', flex: 1 }}>
              {L('Adiciona exercícios livremente', 'Add exercises freely')}
            </div>
            <button
              className="btn"
              disabled={loadingStart}
              onClick={doStartFree}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {L('Começar', 'Start')}
            </button>
          </div>
        </div>

        {/* Spotify */}
        <div style={{
          background: 'var(--bg-raised)', border: '1px solid var(--edge)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>🎵</span>
            <div style={{ flex: 1 }}>
              {spotify.connected ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pos)' }}>
                    Spotify {L('ligado', 'connected')} ✓
                    {spotify.displayName && <span style={{ fontWeight: 400, color: 'var(--ink-dim)', marginLeft: 6 }}>{spotify.displayName}</span>}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                  {L('Liga o Spotify para controlar música durante o treino', 'Connect Spotify to control music during workout')}
                </div>
              )}
            </div>
            {!spotify.connected && (
              <button
                className="btn btn-accent"
                style={{ '--accent': 'var(--pos)', fontSize: 12, padding: '6px 14px' } as React.CSSProperties}
                onClick={() => { window.location.href = '/api/spotify/connect' }}
              >
                {L('Ligar', 'Connect')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: active session ───────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 56,
        borderBottom: '1px solid var(--edge)', padding: '0 20px', gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeWorkout.session.name}
        </span>
        <span className="tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--c-health)', flexShrink: 0 }}>
          {formatElapsed(elapsedSeconds)}
        </span>
        <button
          className="btn"
          onClick={() => setShowFinish(true)}
          style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}
        >
          {L('Terminar', 'Finish')}
        </button>
      </div>

      {/* Spotify mini player */}
      {spotify.connected && (
        <div style={{
          height: isMobile ? 40 : 52, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 16px', background: 'var(--bg-raised)',
          borderBottom: '1px solid var(--edge-soft)', flexShrink: 0,
          width: '100%',
        }}>
          {spotify.albumArt ? (
            <img src={spotify.albumArt} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-raised-2)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {spotify.trackName ?? L('Nada a tocar', 'Nothing playing')}
            </div>
            {spotify.artistName && (
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {spotify.artistName}
              </div>
            )}
          </div>
          {(['previous', 'play', 'next'] as const).map(action => (
            <button
              key={action}
              onClick={() => handleSpotifyControl(action === 'play' ? (spotify.isPlaying ? 'pause' : 'play') : action)}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: 'transparent',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: action === 'play' ? 'var(--c-health)' : 'var(--ink-dim)',
                transition: 'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {action === 'previous' && <Icon name="chevron-left" size={14} />}
              {action === 'play' && <Icon name={spotify.isPlaying ? 'minus' : 'bolt'} size={16} />}
              {action === 'next' && <Icon name="chevron-right" size={14} />}
            </button>
          ))}
        </div>
      )}

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: restTimerActive ? 80 : 16 }}>
        {activeWorkout.exercises.length === 0 && (
          <EmptyState
            icon="activity"
            title={L('Sem exercícios', 'No exercises')}
            subtitle={L('Adiciona exercícios usando o botão em baixo', 'Add exercises using the button below')}
          />
        )}

        {activeWorkout.exercises.map((ex, exIdx) => {
          const rows = localSets[ex.exercise_id] ?? []
          const vs = videoStates[ex.exercise_id]
          const hist = prevHistory[ex.exercise_id] ?? []
          const histStr = formatPrevHistory(hist)

          return (
            <div
              key={ex.exercise_id}
              style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', marginBottom: 12, overflow: 'hidden',
              }}
            >
              {/* Exercise header */}
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--edge-soft)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: 'var(--c-health-dim)',
                  color: 'var(--c-health)', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {exIdx + 1}
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 20 : 14, fontWeight: isMobile ? 600 : 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getLang() === 'pt' && ex.exercise_name_pt ? ex.exercise_name_pt : ex.exercise_name}
                </span>
                <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {ex.target_sets}×{ex.target_reps != null ? ex.target_reps : ex.target_duration_seconds != null ? `${ex.target_duration_seconds}s` : '?'}
                </span>
                <button
                  onClick={() => toggleVideo(ex.exercise_id, ex.exercise_name)}
                  style={{ fontSize: 11, color: 'var(--c-health)', border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0, padding: '2px 6px' }}
                >
                  {vs?.show ? L('Fechar vídeo', 'Close video') : L('Ver vídeo', 'Watch video')}
                </button>
              </div>

              {/* Video section */}
              {vs?.show && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
                  {vs.loading ? (
                    <div style={{ height: 160, borderRadius: 'var(--radius-sm)', background: 'var(--bg-raised-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{L('A carregar...', 'Loading...')}</span>
                    </div>
                  ) : vs.videoId ? (
                    <>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${vs.videoId}`}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 'var(--radius-sm)', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                          allowFullScreen
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          className="btn"
                          onClick={() => handleVideoAction(ex.exercise_id, 'favourite')}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          ❤️ {L('Favorito', 'Favourite')}
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleVideoAction(ex.exercise_id, 'flagged')}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          🚩 {L('Reportar', 'Report')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)' }}>
                      {L('Vídeo não encontrado', 'Video not found')}
                    </div>
                  )}
                </div>
              )}

              {/* Sets section */}
              <div style={{ padding: '0 16px 16px' }}>
                {histStr && (
                  <div style={{ marginTop: 12, marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                    {L('Última', 'Last')}: {histStr}
                  </div>
                )}

                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 72px 60px 30px',
                  gap: 8, padding: '8px 4px 4px',
                  fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.1em',
                }}>
                  <span></span>
                  <span>{L('SÉRIE', 'SET')}</span>
                  <span style={{ textAlign: 'center' }}>KG</span>
                  <span style={{ textAlign: 'center' }}>REPS</span>
                  <span></span>
                </div>

                {rows.map(row => (
                  <div key={row.localId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', minHeight: isMobile ? 52 : undefined }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-raised-2)',
                      color: 'var(--ink-faint)', fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {row.set_number}
                    </div>
                    <div style={{ flex: 1 }} />
                    <input
                      type="number"
                      value={row.weight_kg}
                      onChange={e => updateSetField(ex.exercise_id, row.localId, 'weight_kg', e.target.value)}
                      placeholder="0"
                      disabled={row.completed}
                      className="glow-focus tnum"
                      style={{
                        '--accent': 'var(--c-health)',
                        width: isMobile ? 80 : 72, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                        borderRadius: 'var(--radius-sm)', padding: '7px 8px',
                        fontSize: isMobile ? 16 : 13, color: row.completed ? 'var(--ink-faint)' : 'var(--ink)',
                        outline: 'none', textAlign: 'center',
                        opacity: row.completed ? 0.6 : 1,
                      } as React.CSSProperties}
                    />
                    <input
                      type="number"
                      value={row.reps}
                      onChange={e => updateSetField(ex.exercise_id, row.localId, 'reps', e.target.value)}
                      placeholder="0"
                      disabled={row.completed}
                      className="glow-focus tnum"
                      style={{
                        '--accent': 'var(--c-health)',
                        width: isMobile ? 64 : 60, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
                        borderRadius: 'var(--radius-sm)', padding: '7px 8px',
                        fontSize: isMobile ? 16 : 13, color: row.completed ? 'var(--ink-faint)' : 'var(--ink)',
                        outline: 'none', textAlign: 'center',
                        opacity: row.completed ? 0.6 : 1,
                      } as React.CSSProperties}
                    />
                    <button
                      data-set-btn={row.localId}
                      onClick={e => handleCompleteSet(ex.exercise_id, row.localId, e.currentTarget)}
                      disabled={row.completed}
                      style={{
                        width: isMobile ? 44 : 30, height: isMobile ? 44 : 30, borderRadius: '50%', flexShrink: 0,
                        border: row.completed ? 'none' : '1.5px solid var(--edge)',
                        background: row.completed ? 'var(--c-health)' : 'transparent',
                        cursor: row.completed ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: row.completed ? 'oklch(0.18 0.01 80)' : 'var(--ink-faint)',
                        transition: 'all .15s',
                      }}
                    >
                      {row.completed && <Icon name="check" size={13} />}
                      {row.is_pr && (
                        <span style={{ position: 'absolute', fontSize: 8, top: -2, right: -2, background: 'var(--c-fin)', borderRadius: 99, padding: '1px 3px', color: 'oklch(0.18 0.01 80)', fontWeight: 700 }}>PR</span>
                      )}
                    </button>
                  </div>
                ))}

                <button
                  className="btn"
                  onClick={() => addSetRow(ex.exercise_id)}
                  style={{ fontSize: 11, padding: '5px 12px', marginTop: 8, color: 'var(--ink-faint)' }}
                >
                  <Icon name="plus" size={11} />
                  {L('+ Adicionar Série', '+ Add Set')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rest timer bar */}
      {restTimerActive && (
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0,
          height: isMobile ? 'auto' : 64, zIndex: 200,
          background: 'var(--bg-raised)', borderTop: '1px solid var(--edge)',
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', gap: isMobile ? 8 : 12, padding: isMobile ? '16px 20px' : '0 20px',
        }}>
          {isMobile ? (
            <>
              <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, color: 'var(--c-health)', lineHeight: 1 }}>
                {restRemaining}s
              </span>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{L('Descanso', 'Rest')}</div>
              <button
                className="btn"
                onClick={() => { setRestTimerActive(false); setRestRemaining(0) }}
                style={{ fontSize: 14, padding: '12px', width: '100%', justifyContent: 'center' }}
              >
                {L('Saltar', 'Skip')}
              </button>
            </>
          ) : (
            <>
              <Ring value={restTotal > 0 ? restRemaining / restTotal : 0} color="var(--c-health)" size={44} stroke={4}>
                <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-health)' }}>
                  {restRemaining}
                </span>
              </Ring>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{L('Descanso', 'Rest')}</div>
              </div>
              <button
                className="btn"
                onClick={() => { setRestTimerActive(false); setRestRemaining(0) }}
                style={{ fontSize: 12, padding: '5px 12px' }}
              >
                {L('Saltar', 'Skip')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating add exercise button */}
      <button
        onClick={() => setShowAddExercise(true)}
        style={{
          position: 'fixed', bottom: isMobile ? 20 : 80, right: 20, zIndex: 200,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--c-health)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px -4px var(--c-health)',
          color: 'oklch(0.18 0.01 80)',
        }}
      >
        <Icon name="plus" size={22} />
      </button>

      {/* Finish modal */}
      <Modal open={showFinish} onClose={() => setShowFinish(false)} width={480}>
        <div style={{ padding: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 20 }}>
            {L('Bom trabalho! 💪', 'Great work! 💪')}
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--c-health)' }}>
                {formatElapsed(elapsedSeconds)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{L('Duração', 'Duration')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--c-health)' }}>
                {totalSetsCompleted}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{L('Séries', 'Sets')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--c-health)' }}>
                {activeWorkout.exercises.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{L('Exercícios', 'Exercises')}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{L('Como foi?', 'How was it?')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['too_easy', 'just_right', 'too_hard'] as const).map(fb => (
                <button
                  key={fb}
                  onClick={() => setFinishFeedback(fb)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${finishFeedback === fb ? 'var(--c-health)' : 'var(--edge)'}`,
                    background: finishFeedback === fb ? 'var(--c-health-dim)' : 'var(--bg-raised-2)',
                    color: finishFeedback === fb ? 'var(--c-health)' : 'var(--ink-dim)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s',
                  }}
                >
                  {fb === 'too_easy' ? L('Fácil', 'Easy') : fb === 'just_right' ? L('Perfeito', 'Just right') : L('Difícil', 'Hard')}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={finishNotes}
            onChange={e => setFinishNotes(e.target.value)}
            placeholder={L('Notas (opcional)...', 'Notes (optional)...')}
            rows={3}
            style={{
              width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', padding: '10px 12px',
              fontSize: 13, color: 'var(--ink)', outline: 'none', resize: 'vertical',
              marginBottom: 20,
            }}
          />

          <button
            className="btn btn-accent"
            onClick={handleFinish}
            disabled={savingFinish}
            style={{ '--accent': 'var(--c-health)', width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 14 } as React.CSSProperties}
          >
            {savingFinish ? L('A guardar...', 'Saving...') : L('Guardar Treino', 'Save Workout')}
          </button>
        </div>
      </Modal>

      {/* Exercise picker modal */}
      <Modal open={showAddExercise} onClose={() => { setShowAddExercise(false); setExerciseSearch('') }} width={480}>
        <div style={{ padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            {L('Adicionar Exercício', 'Add Exercise')}
          </div>
          <input
            value={exerciseSearch}
            onChange={e => setExerciseSearch(e.target.value)}
            placeholder={L('Pesquisar exercício...', 'Search exercise...')}
            autoFocus
            className="glow-focus"
            style={{
              '--accent': 'var(--c-health)',
              width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', padding: '9px 12px',
              fontSize: 13, color: 'var(--ink)', outline: 'none', marginBottom: 12,
            } as React.CSSProperties}
          />
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {searchLoading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)' }}>
                {L('A carregar...', 'Loading...')}
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)' }}>
                {L('Nenhum exercício encontrado', 'No exercises found')}
              </div>
            ) : searchResults.map(ex => (
              <button
                key={ex.id}
                onClick={() => handleAddExercise(ex)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getLang() === 'pt' && ex.name_pt ? ex.name_pt : ex.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', padding: '1px 6px', background: 'var(--bg-raised-2)', borderRadius: 99, border: '1px solid var(--edge-soft)', flexShrink: 0 }}>
                  {ex.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

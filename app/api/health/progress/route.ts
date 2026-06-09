import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

function periodToDays(period: string): number {
  if (period === '90d') return 90
  if (period === '6m') return 180
  if (period === '1y') return 365
  return 30
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'
  const days = periodToDays(period)

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()
  const sinceDateStr = sinceStr.split('T')[0]

  const todayStr = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const [sessionsResult, whoopResult, plannedResult] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, user_id, planned_session_id, routine_id, name, session_type, started_at, ended_at, duration_seconds, notes, feedback, spotify_playlist_id, created_at, session_sets(id, session_id, user_id, exercise_id, exercise_name, set_number, reps, weight_kg, is_pr, completed, notes, created_at)')
      .eq('user_id', userRow.id)
      .gte('started_at', sinceStr)
      .order('started_at', { ascending: false }),
    supabase
      .from('whoop_metrics')
      .select('*')
      .eq('user_id', userRow.id)
      .gte('date', sinceDateStr)
      .order('date', { ascending: false }),
    supabase
      .from('planned_sessions')
      .select('id, day_of_week, session_date, session_name, session_type, status, estimated_duration')
      .eq('user_id', userRow.id)
      .gte('session_date', sinceDateStr)
      .lte('session_date', futureDateStr)
      .order('session_date', { ascending: true }),
  ])

  const sessions = sessionsResult.data ?? []
  const whoopMetrics = whoopResult.data ?? []
  const plannedSessions = plannedResult.data ?? []

  const allSets = sessions.flatMap(s => s.session_sets ?? [])
  const completedSets = allSets.filter(s => s.completed)

  // Fetch exercises for muscle group mapping
  const exerciseIds = [...new Set(allSets.map(s => s.exercise_id).filter(Boolean))]
  let exerciseMap: Record<string, { muscle_groups: string[] }> = {}
  if (exerciseIds.length > 0) {
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, muscle_groups')
      .in('id', exerciseIds)
    for (const ex of (exercises ?? [])) {
      exerciseMap[ex.id] = { muscle_groups: ex.muscle_groups ?? [] }
    }
  }

  // Summary
  const totalSessions = sessions.length
  const totalSets = completedSets.length
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0

  // Streaks (consecutive weeks with ≥1 session)
  const sessionWeeks = new Set(sessions.map(s => getWeekKey(s.started_at)))
  const currentWeekKey = getWeekKey(new Date().toISOString())

  let currentStreak = 0
  let weekCursor = currentWeekKey
  for (let i = 0; i < 52; i++) {
    if (!sessionWeeks.has(weekCursor)) break
    currentStreak++
    const d = new Date(weekCursor + 'T00:00:00')
    d.setDate(d.getDate() - 7)
    weekCursor = d.toISOString().split('T')[0]
  }

  const sortedWeeks = Array.from(sessionWeeks).sort()
  let longestStreak = 0
  let tempStreak = 0
  let prevWeek = ''
  for (const week of sortedWeeks) {
    if (!prevWeek) {
      tempStreak = 1
    } else {
      const prev = new Date(prevWeek + 'T00:00:00')
      prev.setDate(prev.getDate() + 7)
      if (prev.toISOString().split('T')[0] === week) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)
    prevWeek = week
  }
  longestStreak = Math.max(longestStreak, currentStreak)

  // Completion rate (planned non-rest sessions up to today)
  const historicalPlanned = plannedSessions.filter(
    s => s.session_date <= todayStr && s.session_type !== 'rest',
  )
  const completionRate = historicalPlanned.length > 0
    ? Math.round((historicalPlanned.filter(s => s.status === 'completed').length / historicalPlanned.length) * 100)
    : 0

  // Sessions per week
  const weekCounts: Record<string, number> = {}
  for (const s of sessions) {
    const week = getWeekKey(s.started_at)
    weekCounts[week] = (weekCounts[week] ?? 0) + 1
  }
  const sessionsPerWeek = Object.entries(weekCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }))

  // Volume by muscle group
  const muscleVolume: Record<string, number> = {}
  for (const set of completedSets) {
    const muscles = exerciseMap[set.exercise_id]?.muscle_groups ?? []
    for (const muscle of muscles) {
      muscleVolume[muscle] = (muscleVolume[muscle] ?? 0) + 1
    }
  }
  const volumeByMuscleGroup = Object.entries(muscleVolume)
    .sort(([, a], [, b]) => b - a)
    .map(([muscle, sets]) => ({ muscle, sets }))

  // Exercise progression — top 5 most logged
  type DataPoint = { date: string; weight_kg: number; reps: number; estimated1rm: number; is_pr: boolean }
  const setsByExercise: Record<string, { name: string; dataPoints: DataPoint[] }> = {}
  for (const s of completedSets) {
    if (!s.weight_kg || !s.reps) continue
    if (!setsByExercise[s.exercise_id]) {
      setsByExercise[s.exercise_id] = { name: s.exercise_name, dataPoints: [] }
    }
    setsByExercise[s.exercise_id].dataPoints.push({
      date: (s.created_at as string).split('T')[0],
      weight_kg: s.weight_kg,
      reps: s.reps,
      estimated1rm: Math.round(s.weight_kg * (1 + s.reps / 30) * 10) / 10,
      is_pr: s.is_pr ?? false,
    })
  }

  const exerciseProgress = Object.entries(setsByExercise)
    .sort(([, a], [, b]) => b.dataPoints.length - a.dataPoints.length)
    .slice(0, 5)
    .map(([exercise_id, { name, dataPoints }]) => ({
      exercise_id,
      exercise_name: name,
      dataPoints: dataPoints.sort((a, b) => a.date.localeCompare(b.date)),
    }))

  // This-week stats for dashboard widget
  const thisWeekSessions = sessions.filter(s => getWeekKey(s.started_at) === currentWeekKey)
  const thisWeekPlanned = plannedSessions.filter(s => {
    const week = getWeekKey(s.session_date + 'T00:00:00')
    return week === currentWeekKey && s.session_type !== 'rest'
  })
  const nextPending = plannedSessions.find(s => s.status === 'pending' && s.session_date >= todayStr) ?? null

  return NextResponse.json({
    summary: { totalSessions, totalSets, totalDuration, avgDuration, currentStreak, longestStreak, completionRate },
    sessionsPerWeek,
    volumeByMuscleGroup,
    exerciseProgress,
    recentSessions: sessions.slice(0, 10),
    whoopMetrics,
    thisWeek: {
      completedSessions: thisWeekSessions.length,
      totalPlannedSessions: thisWeekPlanned.length,
      nextSession: nextPending
        ? { name: nextPending.session_name, dayOfWeek: nextPending.day_of_week, sessionDate: nextPending.session_date }
        : null,
    },
  })
}

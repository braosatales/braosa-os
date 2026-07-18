import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = userRow.id as string
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const startOfDay = `${todayStr}T00:00:00.000Z`
  const endOfDay = `${todayStr}T23:59:59.999Z`

  const [
    mailResult,
    contactsResult,
    tasksResult,
    calendarResult,
    healthResult,
    nutritionResult,
    verumResult,
  ] = await Promise.allSettled([
    // 1. Mail unread count
    (async () => {
      const data = await googleFetch(uid, 'https://www.googleapis.com/gmail/v1/users/me/labels')
      const labels: any[] = data.labels ?? []
      const inbox = labels.find((l) => l.id === 'INBOX')
      return (inbox?.messagesUnread ?? 0) as number
    })(),

    // 2. Contacts pending count
    (async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('review_status', 'pending')
      return (count ?? 0) as number
    })(),

    // 3. Tasks overdue count
    (async () => {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .lt('due_date', now.toISOString())
        .not('due_date', 'is', null)
      return (count ?? 0) as number
    })(),

    // 4. Calendar today count
    (async () => {
      const { data: conn } = await supabase
        .from('google_connections')
        .select('id')
        .eq('user_id', uid)
        .single()
      if (!conn) return 0
      const params = new URLSearchParams({
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: 'true',
        maxResults: '100',
      })
      const data = await googleFetch(
        uid,
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`
      )
      return ((data.items ?? []).length) as number
    })(),

    // 5. Health alert — planned session today but no completed session
    (async () => {
      const [plannedRes, completedRes] = await Promise.all([
        supabase
          .from('planned_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('session_date', todayStr)
          .eq('status', 'pending')
          .limit(1),
        supabase
          .from('workout_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid)
          .gte('started_at', startOfDay)
          .lte('started_at', endOfDay)
          .limit(1),
      ])
      const hasPlanned = (plannedRes.count ?? 0) > 0
      const hasCompleted = (completedRes.count ?? 0) > 0
      return hasPlanned && !hasCompleted
    })(),

    // 6. Nutrition alert — no meals logged today after 13:00
    (async () => {
      if (now.getHours() < 13) return false
      const { count } = await supabase
        .from('food_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('date', todayStr)
      return (count ?? 0) === 0
    })(),

    // 7. Verum overdue milestones
    (async () => {
      const { count } = await supabase
        .from('verum_milestones')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('completed', false)
        .lt('due_date', todayStr)
      return (count ?? 0) > 0
    })(),
  ])

  function getVal<T>(result: PromiseSettledResult<T>, fallback: T): T {
    return result.status === 'fulfilled' ? result.value : fallback
  }

  return NextResponse.json({
    mail:      getVal(mailResult,      0),
    contacts:  getVal(contactsResult,  0),
    tasks:     getVal(tasksResult,     0),
    calendar:  getVal(calendarResult,  0),
    health:    getVal(healthResult,    false),
    nutrition: getVal(nutritionResult, false),
    verum:     getVal(verumResult,     false),
  })
}

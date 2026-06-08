import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  // last 7 days for sparkline
  const week: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const weekStart = week[0]

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits')
      .select('id, name, color')
      .eq('user_id', userRow.id)
      .eq('archived', false)
      .order('created_at', { ascending: true }),
    supabase.from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', userRow.id)
      .gte('logged_date', weekStart)
      .lte('logged_date', today),
  ])

  const logSet = new Set((logs ?? []).map(l => `${l.habit_id}:${l.logged_date}`))

  const habitsWithLogs = (habits ?? []).map(h => ({
    ...h,
    done_today: logSet.has(`${h.id}:${today}`),
    week_days: week.map(d => logSet.has(`${h.id}:${d}`) ? 1 : 0),
  }))

  return NextResponse.json({ habits: habitsWithLogs, today })
}

export async function POST(request: Request) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { habit_id, date } = await request.json()
  const logDate = date ?? new Date().toISOString().split('T')[0]

  // toggle: if log exists delete it, else insert
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habit_id)
    .eq('user_id', userRow.id)
    .eq('logged_date', logDate)
    .single()

  if (existing) {
    await supabase.from('habit_logs').delete().eq('id', existing.id)
    return NextResponse.json({ toggled: 'off' })
  } else {
    await supabase.from('habit_logs').insert({ habit_id, user_id: userRow.id, logged_date: logDate })
    return NextResponse.json({ toggled: 'on' })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { habitId } = body as { habitId?: string }
  if (!habitId) return NextResponse.json({ error: 'habitId required' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('user_id', userRow.id)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    await supabase.from('habit_logs').delete().eq('id', existing.id)
    return NextResponse.json({ doneToday: false })
  }

  await supabase
    .from('habit_logs')
    .insert({ habit_id: habitId, user_id: userRow.id, date: today, completed: true })

  return NextResponse.json({ doneToday: true })
}

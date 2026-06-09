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

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('workout_profiles')
    .select('*')
    .eq('user_id', userRow.id)
    .single()

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data ?? null })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { goal, equipment, available_days, sessions_per_week, session_duration, experience_level, injuries, fitness_notes } = body

  const { data, error } = await supabase
    .from('workout_profiles')
    .insert({ user_id: userRow.id, goal, equipment, available_days, sessions_per_week, session_duration, experience_level, injuries, fitness_notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, profile: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { goal, equipment, available_days, sessions_per_week, session_duration, experience_level, injuries, fitness_notes } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (goal !== undefined) updates.goal = goal
  if (equipment !== undefined) updates.equipment = equipment
  if (available_days !== undefined) updates.available_days = available_days
  if (sessions_per_week !== undefined) updates.sessions_per_week = sessions_per_week
  if (session_duration !== undefined) updates.session_duration = session_duration
  if (experience_level !== undefined) updates.experience_level = experience_level
  if (injuries !== undefined) updates.injuries = injuries
  if (fitness_notes !== undefined) updates.fitness_notes = fitness_notes

  const { data, error } = await supabase
    .from('workout_profiles')
    .update(updates)
    .eq('user_id', userRow.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, profile: data })
}

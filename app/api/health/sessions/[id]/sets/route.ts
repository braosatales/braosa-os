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

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('session_sets')
    .select('*')
    .eq('session_id', id)
    .eq('user_id', userRow.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sets: data ?? [] })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { exercise_id, exercise_name, set_number, reps, weight_kg, duration_seconds, rest_seconds, completed, notes } = body

  // PR check: find max(reps * weight_kg) for this user+exercise historically
  const { data: prev } = await supabase
    .from('session_sets')
    .select('reps,weight_kg')
    .eq('user_id', userRow.id)
    .eq('exercise_id', exercise_id)
    .eq('completed', true)
    .order('created_at', { ascending: false })

  const prevMax = prev?.reduce((max: number, s: { reps: number | null; weight_kg: number | null }) =>
    Math.max(max, (s.reps ?? 0) * (s.weight_kg ?? 0)), 0) ?? 0
  const currentScore = (reps ?? 0) * (weight_kg ?? 0)
  const is_pr = currentScore > 0 && currentScore > prevMax

  const { data, error } = await supabase
    .from('session_sets')
    .insert({
      session_id: id,
      user_id: userRow.id,
      exercise_id,
      exercise_name,
      set_number,
      reps: reps ?? null,
      weight_kg: weight_kg ?? null,
      duration_seconds: duration_seconds ?? null,
      rest_seconds: rest_seconds ?? null,
      completed: completed ?? false,
      notes: notes ?? null,
      is_pr,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, set: data, is_pr }, { status: 201 })
}

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

async function ownsRoutine(supabase: ReturnType<typeof createServiceClient>, routineId: string, userId: string) {
  const { data } = await supabase.from('routines').select('id').eq('id', routineId).eq('user_id', userId).single()
  return !!data
}

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await ownsRoutine(supabase, id, userRow.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('routine_exercises')
    .select('*, exercise:exercises(*)')
    .eq('routine_id', id)
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercises: data ?? [] })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await ownsRoutine(supabase, id, userRow.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { exercise_id, order_index = 0, sets = 3, reps = null, duration_seconds = null, rest_seconds = 60, notes = null, is_superset = false, superset_group = null } = body

  const { data, error } = await supabase
    .from('routine_exercises')
    .insert({ routine_id: id, exercise_id, order_index, sets, reps, duration_seconds, rest_seconds, notes, is_superset, superset_group })
    .select('*, exercise:exercises(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, exercise: data }, { status: 201 })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await ownsRoutine(supabase, id, userRow.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { exercises } = body as { exercises: { id: string; order_index: number }[] }

  await Promise.all(
    exercises.map(({ id: exId, order_index }) =>
      supabase.from('routine_exercises').update({ order_index }).eq('id', exId).eq('routine_id', id)
    )
  )

  return NextResponse.json({ ok: true })
}

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

type Params = { params: Promise<{ id: string; exerciseId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, exerciseId } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await ownsRoutine(supabase, id, userRow.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.sets !== undefined) updates.sets = body.sets
  if (body.reps !== undefined) updates.reps = body.reps
  if (body.duration_seconds !== undefined) updates.duration_seconds = body.duration_seconds
  if (body.rest_seconds !== undefined) updates.rest_seconds = body.rest_seconds
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.order_index !== undefined) updates.order_index = body.order_index
  if (body.is_superset !== undefined) updates.is_superset = body.is_superset
  if (body.superset_group !== undefined) updates.superset_group = body.superset_group

  const { data, error } = await supabase
    .from('routine_exercises')
    .update(updates)
    .eq('id', exerciseId)
    .eq('routine_id', id)
    .select('*, exercise:exercises(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, exercise: data })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, exerciseId } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await ownsRoutine(supabase, id, userRow.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('id', exerciseId)
    .eq('routine_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

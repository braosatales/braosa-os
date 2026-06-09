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

type Params = { params: Promise<{ id: string; setId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { setId } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.reps !== undefined) updates.reps = body.reps
  if (body.weight_kg !== undefined) updates.weight_kg = body.weight_kg
  if (body.completed !== undefined) updates.completed = body.completed
  if (body.notes !== undefined) updates.notes = body.notes

  const { data, error } = await supabase
    .from('session_sets')
    .update(updates)
    .eq('id', setId)
    .eq('user_id', userRow.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, set: data })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { setId } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('session_sets')
    .delete()
    .eq('id', setId)
    .eq('user_id', userRow.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

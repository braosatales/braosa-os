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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.amount_g !== undefined) updates.amount_g = body.amount_g
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.calories !== undefined) updates.calories = body.calories
  if (body.protein_g !== undefined) updates.protein_g = body.protein_g
  if (body.carbs_g !== undefined) updates.carbs_g = body.carbs_g
  if (body.fat_g !== undefined) updates.fat_g = body.fat_g
  if (body.fiber_g !== undefined) updates.fiber_g = body.fiber_g

  const { data, error } = await supabase
    .from('food_logs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userRow.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, log: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', userRow.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

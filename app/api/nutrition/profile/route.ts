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

const DEFAULTS = {
  goal: 'lose_fat',
  target_calories: 2150,
  target_protein_g: 170,
  target_carbs_g: 215,
  target_fat_g: 65,
  target_water_ml: 2500,
  target_weight_kg: 80,
  target_date: '2026-09-30',
  current_weight_kg: 85,
  height_cm: 175,
  age: 30,
  sex: 'male',
  activity_level: 'moderate',
}

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('nutrition_profiles')
    .select('*')
    .eq('user_id', userRow.id)
    .single()

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data ?? { ...DEFAULTS, id: null, user_id: userRow.id } })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('nutrition_profiles')
    .insert({ user_id: userRow.id, ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, profile: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const allowed = [
    'goal', 'target_calories', 'target_protein_g', 'target_carbs_g', 'target_fat_g',
    'target_water_ml', 'target_weight_kg', 'target_date', 'current_weight_kg',
    'height_cm', 'age', 'sex', 'activity_level',
  ]
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('nutrition_profiles')
    .upsert({ user_id: userRow.id, ...updates }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, profile: data })
}

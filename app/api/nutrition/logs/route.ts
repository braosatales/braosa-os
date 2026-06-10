import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { MEAL_META } from '@/lib/nutrition'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userRow.id)
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const logs = data ?? []

  const meals: Record<string, typeof logs> = {}
  for (const meal of Object.keys(MEAL_META)) {
    meals[meal] = logs.filter(l => l.meal === meal)
  }

  const totals = logs.reduce(
    (acc: Record<string, number>, l) => ({
      calories:  acc.calories  + (l.calories  ?? 0),
      protein_g: acc.protein_g + (l.protein_g ?? 0),
      carbs_g:   acc.carbs_g   + (l.carbs_g   ?? 0),
      fat_g:     acc.fat_g     + (l.fat_g     ?? 0),
      fiber_g:   acc.fiber_g   + (l.fiber_g   ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  )

  return NextResponse.json({ logs, meals, totals })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, meal, food_id, food_name, amount_g, calories, protein_g, carbs_g, fat_g, fiber_g, notes, ai_identified, photo_url } = body

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: userRow.id,
      date: date ?? new Date().toISOString().split('T')[0],
      meal,
      food_id: food_id ?? null,
      food_name,
      amount_g,
      calories,
      protein_g: protein_g ?? 0,
      carbs_g: carbs_g ?? 0,
      fat_g: fat_g ?? 0,
      fiber_g: fiber_g ?? 0,
      notes: notes ?? null,
      ai_identified: ai_identified ?? false,
      photo_url: photo_url ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, log: data }, { status: 201 })
}

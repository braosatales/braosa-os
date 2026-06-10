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

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  let query = supabase
    .from('foods')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userRow.id}`)
    .limit(limit)

  if (search.trim()) {
    query = query.or(
      `name.ilike.%${search}%,name_pt.ilike.%${search}%`
    )
  }

  query = query.order('verified', { ascending: false }).order('name', { ascending: true })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ foods: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, name_pt, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, serving_size_g, serving_label } = body

  const { data, error } = await supabase
    .from('foods')
    .insert({
      user_id: userRow.id,
      name,
      name_pt: name_pt ?? null,
      brand: brand ?? null,
      calories_per_100g,
      protein_per_100g: protein_per_100g ?? 0,
      carbs_per_100g: carbs_per_100g ?? 0,
      fat_per_100g: fat_per_100g ?? 0,
      fiber_per_100g: fiber_per_100g ?? 0,
      serving_size_g: serving_size_g ?? 100,
      serving_label: serving_label ?? '100g',
      verified: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, food: data }, { status: 201 })
}

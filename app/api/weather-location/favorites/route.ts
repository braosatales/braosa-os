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
  if (!userRow || !supabase) return NextResponse.json({ favorites: [] })

  const { data, error } = await supabase
    .from('user_favorite_locations')
    .select('*')
    .eq('user_id', userRow.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ favorites: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { display_name, latitude, longitude } = body
  if (typeof display_name !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_favorite_locations')
    .insert({ user_id: userRow.id, display_name, latitude, longitude })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, favorite: data }, { status: 201 })
}

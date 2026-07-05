import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_LOCATION = { display_name: 'Montijo', latitude: 38.7061, longitude: -8.9747 }

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
  if (!userRow || !supabase) return NextResponse.json({ location: DEFAULT_LOCATION })

  const { data } = await supabase
    .from('user_weather_location')
    .select('*')
    .eq('user_id', userRow.id)
    .maybeSingle()

  if (data) return NextResponse.json({ location: data })

  const { data: inserted } = await supabase
    .from('user_weather_location')
    .upsert({ user_id: userRow.id, ...DEFAULT_LOCATION })
    .select()
    .single()

  return NextResponse.json({ location: inserted ?? DEFAULT_LOCATION })
}

export async function PUT(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { display_name, latitude, longitude } = body
  if (typeof display_name !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_weather_location')
    .upsert({ user_id: userRow.id, display_name, latitude, longitude, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, location: data })
}

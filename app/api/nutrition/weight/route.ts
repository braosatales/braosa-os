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

function periodToDays(period: string): number {
  if (period === '90d') return 90
  if (period === '6m')  return 180
  if (period === '1y')  return 365
  return 30
}

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'
  const days = periodToDays(period)

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userRow.id)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { weight_kg, date, notes } = body

  const { data, error } = await supabase
    .from('weight_logs')
    .upsert({
      user_id: userRow.id,
      date: date ?? new Date().toISOString().split('T')[0],
      weight_kg,
      notes: notes ?? null,
    }, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, log: data }, { status: 201 })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

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
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const [habitsRes, logsRes] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, glyph, system, streak')
      .eq('user_id', userRow.id)
      .eq('archived', false),
    supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', userRow.id)
      .eq('date', today),
  ])

  const doneTodaySet = new Set(
    (logsRes.data ?? []).map((l) => l.habit_id as string),
  )

  const habits = (habitsRes.data ?? []).map((h) => ({
    id: h.id as string,
    name: h.name as string,
    glyph: (h.glyph as string | null) ?? 'flame',
    system: (h.system as string | null) ?? null,
    streak: (h.streak as number | null) ?? 0,
    doneToday: doneTodaySet.has(h.id as string),
  }))

  return NextResponse.json({ habits })
}

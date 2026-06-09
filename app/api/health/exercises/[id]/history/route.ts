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

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id: exerciseId } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ sets: [] })

  const { data } = await supabase
    .from('session_sets')
    .select('id,set_number,reps,weight_kg,duration_seconds,completed,is_pr,created_at')
    .eq('user_id', userRow.id)
    .eq('exercise_id', exerciseId)
    .eq('completed', true)
    .order('created_at', { ascending: false })
    .limit(6)

  return NextResponse.json({ sets: data ?? [] })
}

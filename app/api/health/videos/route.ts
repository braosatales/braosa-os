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
  const exercise_id = searchParams.get('exercise_id')
  if (!exercise_id) return NextResponse.json({ video: null })

  const { data: prefs } = await supabase
    .from('exercise_video_prefs')
    .select('*')
    .eq('user_id', userRow.id)
    .eq('exercise_id', exercise_id)

  if (!prefs || prefs.length === 0) return NextResponse.json({ video: null })

  const favourite = prefs.find(p => p.status === 'favourite')
  if (favourite) return NextResponse.json({ video: favourite })

  const notFlagged = prefs.filter(p => p.status !== 'flagged').sort((a, b) => {
    const aDate = a.last_used_at ? new Date(a.last_used_at).getTime() : 0
    const bDate = b.last_used_at ? new Date(b.last_used_at).getTime() : 0
    return bDate - aDate
  })

  return NextResponse.json({ video: notFlagged[0] ?? null })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { exercise_id, youtube_video_id, youtube_title, status = 'neutral' } = body

  const { data, error } = await supabase
    .from('exercise_video_prefs')
    .upsert(
      {
        user_id: userRow.id,
        exercise_id,
        youtube_video_id,
        youtube_title: youtube_title ?? null,
        status,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,exercise_id,youtube_video_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, video: data })
}

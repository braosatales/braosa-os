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
  const status = searchParams.get('status')
  const platform = searchParams.get('platform')

  let query = supabase
    .from('braosa_content')
    .select('*')
    .eq('user_id', userRow.id)

  if (status) query = query.eq('status', status)
  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ content: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, body: contentBody, platform, status, scheduled_for, tags, notes } = body

  if (!title || !platform) return NextResponse.json({ error: 'title and platform required' }, { status: 400 })

  const { data, error } = await supabase
    .from('braosa_content')
    .insert({
      user_id: userRow.id,
      title,
      body: contentBody ?? null,
      platform,
      status: status ?? 'idea',
      scheduled_for: scheduled_for ?? null,
      tags: tags ?? [],
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ content: data })
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabase
    .from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userRow.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabase
    .from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json()
  const { content, world } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const id = 'note_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  const { data, error } = await supabase
    .from('notes')
    .insert({
      id,
      user_id: userRow.id,
      content: content.trim(),
      world: world ?? null,
      status: 'unread',
      source: 'braosa_os',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, note: data })
}

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

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, message_count, updated_at, created_at')
    .eq('user_id', userRow.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conversations = (data ?? []).map(c => ({
    id: c.id as string,
    title: (c.title as string | null) ?? null,
    message_count: (c.message_count as number) ?? 0,
    updated_at: (c.updated_at as string) ?? (c.created_at as string),
  }))

  return NextResponse.json({ conversations })
}

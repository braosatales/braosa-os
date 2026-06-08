import { NextRequest, NextResponse } from 'next/server'
import { verifyIClaudeKey, unauthorized } from '@/lib/iclaudeAuth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  if (!verifyIClaudeKey(request)) return unauthorized()

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').limit(1).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, tags, pinned, updated_at')
    .eq('user_id', userRow.id)
    .eq('archived', false)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notes = (data ?? []).map(n => ({ ...n, content: n.content.slice(0, 500) }))
  return NextResponse.json({ notes })
}

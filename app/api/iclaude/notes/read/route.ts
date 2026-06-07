import { NextRequest, NextResponse } from 'next/server'
import { verifyIClaudeKey, unauthorized } from '@/lib/iclaudeAuth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  if (!verifyIClaudeKey(request)) return unauthorized()

  let body: { note_ids: string[]; source?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.note_ids || body.note_ids.length === 0) {
    return NextResponse.json({ error: 'note_ids required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('notes')
    .update({ status: 'read' })
    .in('id', body.note_ids)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: data?.length ?? 0, status: 'ok' })
}

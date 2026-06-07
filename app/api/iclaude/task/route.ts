import { NextRequest, NextResponse } from 'next/server'
import { verifyIClaudeKey, unauthorized } from '@/lib/iclaudeAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { mapIClaudeTaskToDB, type IClaudeTask } from '@/lib/iclaudeMapping'

export async function POST(request: NextRequest) {
  if (!verifyIClaudeKey(request)) return unauthorized()

  let body: IClaudeTask
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.id || !body.title) {
    return NextResponse.json({ error: 'id and title are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: userRow, error: userError } = await supabase
    .from('users').select('id').limit(1).single()

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const mapped = mapIClaudeTaskToDB(body, userRow.id)

  const { data, error } = await supabase
    .from('tasks')
    .upsert(mapped, { onConflict: 'external_id', ignoreDuplicates: false })
    .select('id, external_id, title, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, task: data, action: 'upserted' })
}

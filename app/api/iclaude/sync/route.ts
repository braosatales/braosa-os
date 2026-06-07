import { NextRequest, NextResponse } from 'next/server'
import { verifyIClaudeKey, unauthorized } from '@/lib/iclaudeAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { type IClaudeProject, type IClaudeDecision } from '@/lib/iclaudeMapping'

export async function POST(request: NextRequest) {
  if (!verifyIClaudeKey(request)) return unauthorized()

  let body: {
    synced_at: string
    active_projects?: IClaudeProject[]
    key_decisions?: IClaudeDecision[]
    tasks_created_this_session?: string[]
    source: string
  }

  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').limit(1).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const userId = userRow.id
  const results: Record<string, unknown> = { synced_at: body.synced_at }

  if (body.active_projects && body.active_projects.length > 0) {
    const projectRows = body.active_projects.map(p => ({
      user_id: userId,
      name: p.name,
      world: p.world,
      status: p.status,
      next_action: p.next_action ?? null,
    }))
    const { error } = await supabase.from('projects')
      .upsert(projectRows, { onConflict: 'id', ignoreDuplicates: false })
    results.projects = error ? `error: ${error.message}` : `${projectRows.length} upserted`
  }

  if (body.key_decisions && body.key_decisions.length > 0) {
    const decisionRows = body.key_decisions.map(d => ({
      user_id: userId,
      decision: d.decision,
      world: d.world,
      date: d.date,
      source: 'iclaude',
    }))
    const { error } = await supabase.from('key_decisions').insert(decisionRows)
    results.decisions = error ? `error: ${error.message}` : `${decisionRows.length} inserted`
  }

  results.tasks_confirmed = body.tasks_created_this_session?.length ?? 0
  return NextResponse.json({ ok: true, ...results })
}

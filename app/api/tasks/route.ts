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

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userRow.id)
    .neq('status', 'cancelled')
    .order('is_favourite', { ascending: false })
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  console.log('POST /api/tasks USER:', userRow?.id)
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  console.log('POST /api/tasks BODY:', body)
  const { title, description, priority, due_date, due_time, system, project_id, tags, is_favourite } = body

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userRow.id,
      title,
      description: description ?? null,
      priority: priority ?? 3,
      due_date: due_date ?? null,
      due_time: due_time ?? null,
      system: system ?? null,
      project_id: project_id ?? null,
      tags: tags ?? [],
      is_favourite: is_favourite ?? false,
      status: body.status ?? 'todo',
    })
    .select()
    .single()

  if (error) { console.log('POST /api/tasks ERROR:', error); return NextResponse.json({ error: error.message, details: error }, { status: 500 }) }
  return NextResponse.json({ ok: true, task: data }, { status: 201 })
}

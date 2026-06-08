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

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, priority, fav, due_date, system, status')
    .eq('user_id', userRow.id)
    .not('status', 'in', '("done","cancelled")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tasks = (data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    priority: (t.priority as number) ?? 3,
    fav: (t.fav as boolean) ?? false,
    due: (t.due_date as string | null) ?? null,
    system: (t.system as string | null) ?? null,
    status: (t.status as string) ?? 'todo',
  }))

  const overdueCount = tasks.filter((t) => t.due && t.due < today).length

  return NextResponse.json({ tasks, total: tasks.length, overdueCount })
}

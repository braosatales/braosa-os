import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayTasks }, { data: overdue }, { data: upcoming }] = await Promise.all([
    supabase.from('tasks')
      .select('id, title, priority, system, status, due_date')
      .eq('user_id', userRow.id).eq('status', 'todo').eq('due_date', today)
      .order('priority', { ascending: true }),
    supabase.from('tasks')
      .select('id, title, priority, system, status, due_date')
      .eq('user_id', userRow.id).eq('status', 'todo').lt('due_date', today).not('due_date', 'is', null)
      .order('due_date', { ascending: true }),
    supabase.from('tasks')
      .select('id, title, priority, system, status, due_date')
      .eq('user_id', userRow.id).eq('status', 'todo').gt('due_date', today)
      .order('due_date', { ascending: true }).limit(10),
  ])

  return NextResponse.json({
    today: todayTasks ?? [],
    overdue: overdue ?? [],
    upcoming: upcoming ?? [],
  })
}

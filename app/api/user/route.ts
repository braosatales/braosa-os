import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: { name?: string } = {}
  if (typeof body.name === 'string') updates.name = body.name

  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('users')
    .update(updates)
    .eq('supabase_uid', user.id)
    .select('id, name, email, life_score, level, xp_to_next, streak')
    .single()

  if (error || !row) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({
    id: row.id,
    name: row.name,
    email: row.email,
    life_score: row.life_score ?? 0,
    level: row.level ?? 1,
    xp_to_next: row.xp_to_next ?? 0,
    streak: row.streak ?? 0,
  })
}

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('users')
    .select('id, name, email, life_score, level, xp_to_next, streak')
    .eq('supabase_uid', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    id: row.id,
    name: row.name,
    email: row.email,
    life_score: row.life_score ?? 0,
    level: row.level ?? 1,
    xp_to_next: row.xp_to_next ?? 0,
    streak: row.streak ?? 0,
  })
}

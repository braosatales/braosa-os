import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

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

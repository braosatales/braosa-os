import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: conn } = await supabase
    .from('google_connections')
    .select('access_token')
    .eq('user_id', userRow.id)
    .single()

  await supabase.from('google_connections').delete().eq('user_id', userRow.id)

  if (conn?.access_token) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, {
      method: 'POST',
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}

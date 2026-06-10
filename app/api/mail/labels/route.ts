import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

export async function GET() {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await googleFetch(
      userRow.id as string,
      'https://www.googleapis.com/gmail/v1/users/me/labels'
    )
    const labels = (data.labels ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      unreadCount: l.messagesUnread ?? 0,
      totalCount: l.messagesTotal ?? 0,
    }))
    return NextResponse.json({ labels })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

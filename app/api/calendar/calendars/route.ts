import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextResponse } from 'next/server'
import type { GoogleCalendar } from '@/lib/calendar'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

export async function GET() {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await googleFetch(
      userRow.id as string,
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250'
    )

    const calendars: GoogleCalendar[] = (data.items ?? []).map((item: any) => ({
      id: item.id,
      summary: item.summary ?? '',
      description: item.description ?? null,
      backgroundColor: item.backgroundColor ?? '#4CAF50',
      foregroundColor: item.foregroundColor ?? '#ffffff',
      primary: !!item.primary,
      selected: item.selected !== false,
      accessRole: item.accessRole ?? 'reader',
    }))

    return NextResponse.json({ calendars })
  } catch (err: any) {
    console.error('calendar list error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to fetch calendars' }, { status: 500 })
  }
}

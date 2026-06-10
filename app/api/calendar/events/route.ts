import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'
import { parseGoogleEvent } from '@/lib/calendar'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

async function fetchEventsForCalendar(
  userId: string,
  calendarId: string,
  start: string,
  end: string,
  search?: string
) {
  const params = new URLSearchParams({
    timeMin: start,
    timeMax: end,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  if (search) params.set('q', search)

  const encodedId = encodeURIComponent(calendarId)
  const data = await googleFetch(
    userId,
    `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params}`
  )

  return (data.items ?? []).map((item: any) => parseGoogleEvent(item, calendarId))
}

export async function GET(request: NextRequest) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const calendarId = searchParams.get('calendarId') ?? 'primary'
  const search = searchParams.get('search') ?? ''

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end required' }, { status: 400 })
  }

  try {
    if (calendarId === 'all') {
      // Fetch all selected calendars
      const calData = await googleFetch(
        userRow.id as string,
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250'
      )
      const calendars = (calData.items ?? []).filter((c: any) => c.selected !== false)
      const results = await Promise.all(
        calendars.map((cal: any) =>
          fetchEventsForCalendar(userRow.id as string, cal.id, start, end, search || undefined)
            .catch(() => [])
        )
      )
      const events = results.flat()
      events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      return NextResponse.json({ events })
    }

    const events = await fetchEventsForCalendar(
      userRow.id as string,
      calendarId,
      start,
      end,
      search || undefined
    )
    return NextResponse.json({ events })
  } catch (err: any) {
    console.error('calendar events GET error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      calendarId = 'primary',
      title,
      description,
      location,
      start,
      end,
      allDay,
      attendeeEmails = [],
      recurrence,
      colorId,
      reminders,
    } = body

    const googleEvent: any = {
      summary: title,
      description: description ?? undefined,
      location: location ?? undefined,
      start: allDay
        ? { date: start.split('T')[0] }
        : { dateTime: start, timeZone: 'Europe/Lisbon' },
      end: allDay
        ? { date: end.split('T')[0] }
        : { dateTime: end, timeZone: 'Europe/Lisbon' },
    }

    if (attendeeEmails.length > 0) {
      googleEvent.attendees = attendeeEmails.map((email: string) => ({ email }))
    }
    if (recurrence) {
      googleEvent.recurrence = [`RRULE:${recurrence}`]
    }
    if (colorId) {
      googleEvent.colorId = colorId
    }
    if (reminders && reminders.length > 0) {
      googleEvent.reminders = { useDefault: false, overrides: reminders }
    }

    const encodedId = encodeURIComponent(calendarId)
    const data = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleEvent),
      }
    )

    const event = parseGoogleEvent(data, calendarId)
    return NextResponse.json({ event })
  } catch (err: any) {
    console.error('calendar events POST error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create event' }, { status: 500 })
  }
}

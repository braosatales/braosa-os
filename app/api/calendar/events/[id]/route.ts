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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const calendarId = searchParams.get('calendarId') ?? 'primary'

  try {
    const encodedCal = encodeURIComponent(calendarId)
    const data = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${id}`
    )
    const event = parseGoogleEvent(data, calendarId)
    return NextResponse.json({ event })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await request.json()
    const { calendarId = 'primary', updateMode = 'this', ...fields } = body

    const googleEvent: any = {}
    if (fields.title !== undefined) googleEvent.summary = fields.title
    if (fields.description !== undefined) googleEvent.description = fields.description
    if (fields.location !== undefined) googleEvent.location = fields.location
    if (fields.start !== undefined) {
      googleEvent.start = fields.allDay
        ? { date: fields.start.split('T')[0] }
        : { dateTime: fields.start, timeZone: 'Europe/Lisbon' }
    }
    if (fields.end !== undefined) {
      googleEvent.end = fields.allDay
        ? { date: fields.end.split('T')[0] }
        : { dateTime: fields.end, timeZone: 'Europe/Lisbon' }
    }
    if (fields.colorId !== undefined) googleEvent.colorId = fields.colorId
    if (fields.attendeeEmails !== undefined) {
      googleEvent.attendees = fields.attendeeEmails.map((email: string) => ({ email }))
    }
    if (fields.recurrence !== undefined) {
      googleEvent.recurrence = fields.recurrence ? [`RRULE:${fields.recurrence}`] : []
    }
    if (fields.reminders !== undefined) {
      googleEvent.reminders = { useDefault: false, overrides: fields.reminders }
    }

    const encodedCal = encodeURIComponent(calendarId)
    let eventId = id
    // For 'following' or 'all' we patch on the recurring event itself
    if (updateMode === 'all' && fields.recurringEventId) {
      eventId = fields.recurringEventId
    }

    const data = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleEvent),
      }
    )

    const event = parseGoogleEvent(data, calendarId)
    return NextResponse.json({ event })
  } catch (err: any) {
    console.error('calendar events PATCH error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const calendarId = searchParams.get('calendarId') ?? 'primary'
  const mode = searchParams.get('mode') ?? 'this'

  try {
    const encodedCal = encodeURIComponent(calendarId)

    if (mode === 'all') {
      // Get event to find recurringEventId
      const event = await googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${id}`
      )
      const recurringId = event.recurringEventId ?? id
      await googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${recurringId}`,
        { method: 'DELETE' }
      )
    } else if (mode === 'following') {
      // Cancel this and future by setting recurrence end date
      const event = await googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${id}`
      )
      const until = new Date(event.start?.dateTime ?? event.start?.date ?? Date.now())
      until.setDate(until.getDate() - 1)
      const untilStr = until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const recurringId = event.recurringEventId ?? id
      const existing = await googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${recurringId}`
      )
      const newRecurrence = (existing.recurrence ?? []).map((r: string) => {
        if (r.startsWith('RRULE:') && !r.includes('UNTIL=')) {
          return r + `;UNTIL=${untilStr}`
        }
        return r
      })
      await googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${recurringId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recurrence: newRecurrence }),
        }
      )
    } else {
      await googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${id}`,
        { method: 'DELETE' }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('calendar events DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

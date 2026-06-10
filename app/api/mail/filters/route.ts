import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch, refreshGoogleToken } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

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
      'https://www.googleapis.com/gmail/v1/users/me/settings/filters'
    )
    return NextResponse.json({ filters: data.filter ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { from, to, subject, hasWords, action } = body as {
    from?: string
    to?: string
    subject?: string
    hasWords?: string
    action: {
      addLabel?: string
      markRead?: boolean
      star?: boolean
      trash?: boolean
    }
  }

  try {
    const criteria: any = {}
    if (from) criteria.from = from
    if (to) criteria.to = to
    if (subject) criteria.subject = subject
    if (hasWords) criteria.query = hasWords

    const gmailAction: any = { removeLabelIds: [] as string[], addLabelIds: [] as string[] }
    if (action.addLabel) gmailAction.addLabelIds.push(action.addLabel)
    if (action.markRead) gmailAction.removeLabelIds.push('UNREAD')
    if (action.star) gmailAction.addLabelIds.push('STARRED')
    if (action.trash) {
      gmailAction.addLabelIds.push('TRASH')
      gmailAction.removeLabelIds.push('INBOX')
    }

    const data = await googleFetch(
      userRow.id as string,
      'https://www.googleapis.com/gmail/v1/users/me/settings/filters',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria, action: gmailAction }),
      }
    )
    return NextResponse.json({ filter: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { filterId } = body as { filterId: string }

  try {
    const token = await refreshGoogleToken(userRow.id as string)
    if (!token) return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 })

    const res = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/settings/filters/${filterId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok && res.status !== 204) {
      throw new Error(`Gmail DELETE filter failed: ${res.status}`)
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

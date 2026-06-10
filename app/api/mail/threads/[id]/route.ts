import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { parseEmailAddress, type MailThread } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function findBodyParts(payload: any): { html: string; plain: string } {
  let html = ''
  let plain = ''

  function walk(part: any) {
    if (!part) return
    if (part.mimeType === 'text/html' && part.body?.data) {
      html = html || decodeBase64Url(part.body.data)
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      plain = plain || decodeBase64Url(part.body.data)
    }
    if (part.parts) part.parts.forEach(walk)
  }

  if (payload?.body?.data) {
    if (payload.mimeType === 'text/html') html = decodeBase64Url(payload.body.data)
    else plain = decodeBase64Url(payload.body.data)
  }
  if (payload?.parts) payload.parts.forEach(walk)

  return { html, plain }
}

function parseFullThread(raw: any): MailThread {
  const messages = (raw.messages ?? []).map((msg: any) => {
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
    const fromRaw = getHeader(headers, 'From')
    const toRaw = getHeader(headers, 'To')
    const ccRaw = getHeader(headers, 'Cc')
    const subject = getHeader(headers, 'Subject')
    const dateRaw = getHeader(headers, 'Date')
    const labels: string[] = msg.labelIds ?? []

    const { html, plain } = findBodyParts(msg.payload)
    const body = html || plain

    const parts: any[] = msg.payload?.parts ?? []
    const hasAttachments = parts.some((p: any) => p.filename && p.filename.length > 0)

    const toAddresses = toRaw
      ? toRaw.split(',').map((s: string) => parseEmailAddress(s.trim()))
      : []
    const ccAddresses = ccRaw
      ? ccRaw.split(',').map((s: string) => parseEmailAddress(s.trim()))
      : []

    return {
      id: msg.id,
      threadId: raw.id,
      from: parseEmailAddress(fromRaw),
      to: toAddresses,
      cc: ccAddresses,
      subject,
      snippet: msg.snippet ?? '',
      body,
      date: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
      read: !labels.includes('UNREAD'),
      starred: labels.includes('STARRED'),
      labels,
      hasAttachments,
    }
  })

  const lastMsg = messages[messages.length - 1]
  const allParticipants = new Map<string, { name: string | null; email: string }>()
  for (const msg of messages) {
    allParticipants.set(msg.from.email, msg.from)
    for (const p of msg.to) allParticipants.set(p.email, p)
  }

  return {
    id: raw.id,
    subject: lastMsg?.subject ?? '(no subject)',
    participants: Array.from(allParticipants.values()),
    messages,
    lastDate: lastMsg?.date ?? new Date().toISOString(),
    read: messages.every((m: any) => m.read),
    starred: messages.some((m: any) => m.starred),
    snippet: raw.snippet ?? lastMsg?.snippet ?? '',
    labels: lastMsg?.labels ?? [],
    messageCount: messages.length,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const raw = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`
    )
    const thread = parseFullThread(raw)
    return NextResponse.json({ thread })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { addLabels, removeLabels } = await request.json()

  try {
    await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/gmail/v1/users/me/threads/${id}/modify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addLabelIds: addLabels ?? [],
          removeLabelIds: removeLabels ?? [],
        }),
      }
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

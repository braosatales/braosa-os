import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { parseEmailAddress, FOLDER_TO_GMAIL_LABEL, type MailThread } from '@/lib/mail'
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

function parseGmailThread(raw: any): MailThread {
  const messages = (raw.messages ?? []).map((msg: any) => {
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
    const fromRaw = getHeader(headers, 'From')
    const toRaw = getHeader(headers, 'To')
    const ccRaw = getHeader(headers, 'Cc')
    const subject = getHeader(headers, 'Subject')
    const dateRaw = getHeader(headers, 'Date')

    const labels: string[] = msg.labelIds ?? []
    const read = !labels.includes('UNREAD')
    const starred = labels.includes('STARRED')

    const hasAttachments = !!(msg.payload?.parts ?? []).some(
      (p: any) => p.filename && p.filename.length > 0
    )

    let body = ''
    const parts = msg.payload?.parts ?? []
    const findBody = (parts: any[]): string => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return decodeBase64Url(part.body.data)
        }
        if (part.parts) {
          const found = findBody(part.parts)
          if (found) return found
        }
      }
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return decodeBase64Url(part.body.data)
        }
      }
      return ''
    }

    if (msg.payload?.body?.data) {
      body = decodeBase64Url(msg.payload.body.data)
    } else if (parts.length > 0) {
      body = findBody(parts)
    }

    const toAddresses = toRaw
      ? toRaw.split(',').map((s: string) => parseEmailAddress(s.trim()))
      : []
    const ccAddresses = ccRaw
      ? ccRaw.split(',').map((s: string) => parseEmailAddress(s.trim()))
      : []

    return {
      id: msg.id,
      threadId: msg.threadId ?? raw.id,
      from: parseEmailAddress(fromRaw),
      to: toAddresses,
      cc: ccAddresses,
      subject,
      snippet: msg.snippet ?? '',
      body,
      date: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
      read,
      starred,
      labels,
      hasAttachments,
    }
  })

  const lastMsg = messages[messages.length - 1]
  const firstMsg = messages[0]
  const allParticipants = new Map<string, { name: string | null; email: string }>()
  for (const msg of messages) {
    allParticipants.set(msg.from.email, msg.from)
    for (const p of msg.to) allParticipants.set(p.email, p)
  }

  return {
    id: raw.id,
    subject: lastMsg?.subject ?? firstMsg?.subject ?? '(no subject)',
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

export async function GET(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const folder = searchParams.get('folder') ?? 'inbox'
  const search = searchParams.get('search') ?? ''
  const pageToken = searchParams.get('pageToken') ?? ''
  const maxResults = parseInt(searchParams.get('maxResults') ?? '20', 10)

  try {
    const gmailLabel = FOLDER_TO_GMAIL_LABEL[folder] ?? folder.toUpperCase()

    const params = new URLSearchParams()
    if (search) {
      params.set('q', search)
    } else {
      params.set('labelIds', gmailLabel)
    }
    params.set('maxResults', String(maxResults))
    if (pageToken) params.set('pageToken', pageToken)

    const listData = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/gmail/v1/users/me/threads?${params}`
    )

    const threadIds: string[] = (listData.threads ?? []).map((t: any) => t.id)
    const nextPageToken = listData.nextPageToken ?? null

    // Fetch metadata for each thread in parallel (batched to 10)
    const threads: MailThread[] = []
    const batchSize = 10
    for (let i = 0; i < threadIds.length; i += batchSize) {
      const batch = threadIds.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(id =>
          googleFetch(
            userRow.id as string,
            `https://www.googleapis.com/gmail/v1/users/me/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
          )
        )
      )
      for (const raw of results) {
        if (raw?.id) threads.push(parseGmailThread(raw))
      }
    }

    const unreadCount = threads.filter(t => !t.read).length

    return NextResponse.json({ threads, nextPageToken, unreadCount })
  } catch (err: any) {
    console.error('mail threads error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to fetch threads' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id, email').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

function buildRfc2822(opts: {
  from: string
  to: string[]
  cc?: string[]
  subject: string
  body: string
  inReplyTo?: string
  references?: string
  threadId?: string
}): string {
  const lines: string[] = []
  lines.push(`From: ${opts.from}`)
  lines.push(`To: ${opts.to.join(', ')}`)
  if (opts.cc?.length) lines.push(`Cc: ${opts.cc.join(', ')}`)
  lines.push(`Subject: ${opts.subject}`)
  lines.push(`MIME-Version: 1.0`)
  lines.push(`Content-Type: text/plain; charset=UTF-8`)
  lines.push(`Content-Transfer-Encoding: 7bit`)
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`)
  if (opts.references) lines.push(`References: ${opts.references}`)
  lines.push('')
  lines.push(opts.body)
  return lines.join('\r\n')
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function POST(request: NextRequest) {
  const { user, userRow } = await resolveUser()
  if (!userRow || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { to, cc, subject, body: emailBody, inReplyTo, threadId } = body as {
    to: string[]
    cc?: string[]
    subject: string
    body: string
    inReplyTo?: string
    threadId?: string
  }

  const fromEmail = user.email ?? userRow.email ?? ''
  const raw = buildRfc2822({
    from: fromEmail,
    to,
    cc,
    subject,
    body: emailBody,
    inReplyTo,
    references: inReplyTo,
  })

  const payload: any = { raw: encodeBase64Url(raw) }
  if (threadId) payload.threadId = threadId

  try {
    const result = await googleFetch(
      userRow.id as string,
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    return NextResponse.json({ messageId: result.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

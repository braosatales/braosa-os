import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id, name').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

export async function POST(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const { threadId, instruction } = await request.json()

  const userName = (userRow as any).name ?? 'User'

  let userPrompt: string

  if (threadId === '__compose__') {
    // New email compose — no thread context
    userPrompt = instruction || 'Write a professional email.'
  } else {
    // Fetch the thread
    const threadRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/mail/threads/${threadId}`,
      { headers: { Cookie: request.headers.get('cookie') ?? '' } }
    )
    if (!threadRes.ok) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    const { thread } = await threadRes.json()

    // Build thread summary (last 5 messages max)
    const recentMessages = (thread.messages ?? []).slice(-5)
    const threadSummary = recentMessages.map((m: any) => {
      const from = m.from.name ? `${m.from.name} <${m.from.email}>` : m.from.email
      const date = new Date(m.date).toLocaleString()
      const body = m.body
        ? m.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
        : m.snippet
      return `--- ${from} (${date}) ---\n${body}`
    }).join('\n\n')

    userPrompt = instruction
      ? `Here is the email thread:\n\n${threadSummary}\n\n${instruction}`
      : `Here is the email thread:\n\n${threadSummary}\n\nWrite a reply to the last message.`
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `You are writing emails on behalf of ${userName}. Match their tone — professional but warm. Write in the same language as the thread (Portuguese or English). Be concise. Return only the email body text, no subject line, no greeting metadata.`,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    const draft = data.content?.[0]?.text ?? ''
    return NextResponse.json({ draft })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

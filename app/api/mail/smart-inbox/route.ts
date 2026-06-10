import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

// Module-level in-memory cache keyed by userId:date
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase
    .from('users').select('id, name').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

export async function GET(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get('refresh') === 'true'

  const today = new Date().toISOString().slice(0, 10)
  const cacheKey = `${userRow.id}:${today}`

  if (!refresh && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!
    if (Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    // Fetch last 50 inbox threads (metadata only)
    const listData = await googleFetch(
      userRow.id as string,
      'https://www.googleapis.com/gmail/v1/users/me/threads?labelIds=INBOX&maxResults=50'
    )
    const threadIds: string[] = (listData.threads ?? []).map((t: any) => t.id)

    // Fetch metadata in parallel (batched to avoid rate limits)
    const batchSize = 20
    const metaThreads: any[] = []
    for (let i = 0; i < threadIds.length; i += batchSize) {
      const batch = threadIds.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map((id: string) =>
          googleFetch(
            userRow.id as string,
            `https://www.googleapis.com/gmail/v1/users/me/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
          ).catch(() => null)
        )
      )
      metaThreads.push(...results.filter(Boolean))
    }

    const emailList = metaThreads
      .filter((t: any) => t?.id)
      .map((t: any) => {
        const msg = t.messages?.[0]
        if (!msg) return null
        const headers: any[] = msg.payload?.headers ?? []
        const h = (name: string) =>
          headers.find((x: any) => x.name.toLowerCase() === name)?.value ?? ''
        return {
          threadId: t.id as string,
          subject: h('subject') || '(no subject)',
          from: h('from'),
          date: h('date'),
          snippet: (t.snippet ?? msg.snippet ?? '') as string,
        }
      })
      .filter(Boolean) as Array<{
        threadId: string; subject: string; from: string; date: string; snippet: string
      }>

    const userName = (userRow as any).name ?? 'User'

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: `You are an email triage assistant for ${userName}. Analyse these emails and categorise them.`,
        messages: [{
          role: 'user',
          content: `Here are ${emailList.length} emails. Categorise each by:\n- action_needed: requires a reply or action from the user\n- waiting: user is waiting for a response from someone\n- fyi: informational, no action needed\n- invoice: contains a bill or receipt\n- newsletter: newsletter or marketing\n- spam: likely spam or irrelevant\n\nAlso identify:\n- top 3 most urgent emails needing action\n- any invoices that should be scanned\n\nReturn ONLY JSON:\n{\n  "categorised": [{ "threadId": string, "category": string, "urgency": "high"|"medium"|"low", "reason": string }],\n  "urgent": string[],\n  "invoices": string[]\n}\n\nEmails:\n${JSON.stringify(emailList)}`,
        }],
      }),
    })

    if (!aiRes.ok) throw new Error(`Anthropic ${aiRes.status}`)
    const aiData = await aiRes.json()
    const text: string = aiData.content?.[0]?.text ?? '{}'

    let parsed: { categorised: any[]; urgent: string[]; invoices: string[] } = {
      categorised: [], urgent: [], invoices: [],
    }
    try {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) parsed = JSON.parse(m[0])
    } catch { /* keep empty */ }

    // Merge thread metadata into each categorised item
    const metaMap = new Map(emailList.map(e => [e.threadId, e]))
    const categorised = (parsed.categorised ?? []).map((item: any) => ({
      ...metaMap.get(item.threadId),
      ...item,
    }))

    const generatedAt = new Date().toISOString()
    const result = {
      categorised,
      urgent: parsed.urgent ?? [],
      invoices: parsed.invoices ?? [],
      generatedAt,
    }

    cache.set(cacheKey, { data: result, ts: Date.now() })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

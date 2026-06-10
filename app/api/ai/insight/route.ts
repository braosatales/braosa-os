import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/ai-context'
import { NextRequest, NextResponse } from 'next/server'

const insightCache = new Map<string, { insight: string; date: string }>()

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

export async function GET(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ insight: 'ANTHROPIC_API_KEY not configured.' })
  }

  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `${userRow.id}:${today}`
  const force = new URL(request.url).searchParams.get('force') === 'true'

  if (!force && insightCache.has(cacheKey)) {
    return NextResponse.json({ insight: insightCache.get(cacheKey)!.insight })
  }

  const systemPrompt = await buildSystemPrompt(userRow.id as string)

  let insight: string
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content:
              'Based on this user\'s data, give ONE short insight, observation, or suggestion (max 2 sentences). Be specific and actionable. Reference actual numbers. Respond in the user\'s language (PT default).',
          },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    insight = (data.content?.[0]?.text as string) ?? ''
  } catch (err) {
    console.error('AI insight error:', err)
    return NextResponse.json({ insight: null })
  }

  insightCache.set(cacheKey, { insight, date: today })

  return NextResponse.json({ insight })
}

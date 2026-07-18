import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

export async function POST(request: NextRequest) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const extraContext = body?.context ?? ''

    const now = new Date()
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const supabase = createServiceClient()

    // Fetch events, tasks, and workout plan in parallel
    const [eventsData, tasksData, workoutsData] = await Promise.all([
      googleFetch(
        userRow.id as string,
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${in14.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`
      ).catch(() => ({ items: [] })),
      supabase
        .from('tasks')
        .select('title, due, priority, status')
        .eq('user_id', userRow.id)
        .in('status', ['todo', 'doing'])
        .or(`due.lte.${now.toISOString()},priority.eq.1`)
        .limit(20),
      supabase
        .from('planned_sessions')
        .select('day, type, duration_min')
        .eq('user_id', userRow.id)
        .gte('day', now.toISOString().split('T')[0])
        .lte('day', in14.toISOString().split('T')[0])
        .limit(10),
    ])

    const events = (eventsData.items ?? []).slice(0, 20).map((e: any) => ({
      title: e.summary,
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
    }))

    const tasks = (tasksData.data ?? []).map((t: any) => ({
      title: t.title,
      due: t.due,
      priority: t.priority,
    }))

    const workouts = ((workoutsData as any).data ?? [])

    const contextBlock = [
      `Events next 14 days: ${JSON.stringify(events)}`,
      `Pending tasks (overdue/high priority): ${JSON.stringify(tasks)}`,
      `Workout plan this period: ${JSON.stringify(workouts)}`,
      extraContext ? `Extra context: ${extraContext}` : '',
    ].filter(Boolean).join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: 'You are a personal scheduling assistant. Suggest 3 specific, actionable scheduling improvements. Each suggestion must be under 20 words. Respond in PT or EN based on context language. Return JSON: {"suggestions": ["...", "...", "..."]}',
        messages: [{ role: 'user', content: contextBlock }],
      }),
    })

    if (!res.ok) return NextResponse.json({ suggestions: [] })
    const data = await res.json()
    const text = data.content?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return NextResponse.json({ suggestions: parsed.suggestions ?? [] })
  } catch (err: any) {
    console.error('calendar ai-suggest error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = userRow.id
  const body = await request.json()
  const { weekStart, feedback, customRequest } = body as { weekStart: string; feedback?: string; customRequest?: string }

  const { data: profile } = await supabase
    .from('workout_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'No workout profile set up' }, { status: 400 })

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id,name,name_pt,muscle_groups,equipment_needed,type,difficulty')

  const userEquip = profile.equipment as string[]
  const filtered = exercises?.filter((e: { equipment_needed: string[] }) =>
    e.equipment_needed.some((eq: string) => userEquip.includes(eq))
  ) ?? []

  const apiKey = process.env.ANTHROPIC_API_KEY

  let parsed: { reasoning: string; sessions: Array<Record<string, unknown>> }

  if (!apiKey) {
    parsed = {
      reasoning: "Mock plan — configure ANTHROPIC_API_KEY to generate real AI plans.",
      sessions: (profile.available_days as string[]).slice(0, profile.sessions_per_week).map((day: string, i: number) => ({
        day_of_week: day,
        session_date: weekStart,
        session_name: ['Push Day', 'Pull Day', 'Leg Day', 'Full Body'][i % 4],
        session_type: 'strength',
        estimated_duration: profile.session_duration,
        ai_notes: 'Configure ANTHROPIC_API_KEY for personalized plans.',
        exercises: filtered.slice(i * 4, i * 4 + 5).map((e: { id: string; name: string; name_pt: string | null }) => ({
          exercise_id: e.id,
          name: e.name,
          name_pt: e.name_pt,
          sets: 3,
          reps: 10,
          duration_seconds: null,
          rest_seconds: 60,
          notes: null,
        }))
      }))
    }
  } else {
    const systemPrompt = "You are a professional personal trainer AI. Generate a weekly training plan in JSON format only. No preamble, no explanation outside the JSON. Return valid parseable JSON."

    const exerciseList = filtered
      .map((e: { id: string; name: string; muscle_groups: string[]; type: string }) =>
        `${e.id}|${e.name}|${e.muscle_groups.join(',')}|${e.type}`
      )
      .join('\n')

    const userMessage = `Generate a weekly training plan for this user:
- Goal: ${profile.goal}
- Experience: ${profile.experience_level}
- Available days: ${(profile.available_days as string[]).join(', ')}
- Sessions per week: ${profile.sessions_per_week}
- Session duration: ${profile.session_duration} minutes
- Equipment: ${(profile.equipment as string[]).join(', ')}
- Injuries: ${profile.injuries || 'None'}
- Notes: ${profile.fitness_notes || 'None'}
- Week starting (Monday): ${weekStart}
${feedback ? `- Previous week feedback: ${feedback}` : ''}
${customRequest ? `- Special request: ${customRequest}` : ''}

Available exercises (exercise_id|name|muscle_groups|type):
${exerciseList}

Return ONLY this JSON (no markdown, no explanation):
{
  "reasoning": "2-3 sentence explanation of why this plan suits the user",
  "sessions": [
    {
      "day_of_week": "MO",
      "session_date": "${weekStart}",
      "session_name": "Push Day A",
      "session_type": "strength",
      "estimated_duration": 60,
      "ai_notes": "Focus on controlled negatives",
      "exercises": [
        {
          "exercise_id": "uuid",
          "name": "Bench Press",
          "name_pt": "Supino",
          "sets": 4,
          "reps": 8,
          "duration_seconds": null,
          "rest_seconds": 90,
          "notes": "Keep elbows at 45 degrees"
        }
      ]
    }
  ]
}
Only include training days (not rest days unless session_type is 'rest').
Match the number of sessions to sessions_per_week (${profile.sessions_per_week}).`

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const aiResult = await aiResponse.json()
    const responseText: string = aiResult.content?.[0]?.text ?? '{}'

    try {
      parsed = JSON.parse(responseText)
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
      parsed = JSON.parse(jsonMatch[0])
    }
  }

  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({
      user_id: userId,
      week_start: weekStart,
      plan_data: { sessions: parsed.sessions },
      ai_reasoning: parsed.reasoning,
      status: 'active',
    })
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  const { data: sessions, error: sessionsError } = await supabase
    .from('planned_sessions')
    .insert(
      parsed.sessions.map((s: Record<string, unknown>) => ({
        plan_id: plan.id,
        user_id: userId,
        day_of_week: s.day_of_week,
        session_date: s.session_date,
        session_name: s.session_name,
        session_type: s.session_type,
        exercises: s.exercises ?? [],
        estimated_duration: s.estimated_duration ?? null,
        ai_notes: s.ai_notes ?? null,
        status: 'pending',
      }))
    )
    .select()

  if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 })

  return NextResponse.json({ plan, sessions })
}

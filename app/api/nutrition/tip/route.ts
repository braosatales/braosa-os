import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const tipCache = new Map<string, { tip: string; date: string }>()

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ tip: null })
  }

  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `${userRow.id}:${today}`

  if (tipCache.has(cacheKey)) {
    return NextResponse.json({ tip: tipCache.get(cacheKey)!.tip })
  }

  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceStr = since.toISOString().split('T')[0]

  const [logsRes, profileRes] = await Promise.all([
    supabase
      .from('food_logs')
      .select('date,calories,protein_g,carbs_g,fat_g')
      .eq('user_id', userRow.id)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('nutrition_profiles')
      .select('goal,target_calories,target_protein_g,target_carbs_g,target_fat_g,current_weight_kg,target_weight_kg')
      .eq('user_id', userRow.id)
      .single(),
  ])

  const logs = logsRes.data ?? []
  const profile = profileRes.data

  const byDate = new Map<string, number>()
  for (const log of logs) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + (log.calories ?? 0))
  }
  const avgCalories = byDate.size > 0
    ? Math.round(Array.from(byDate.values()).reduce((s, v) => s + v, 0) / byDate.size)
    : 0

  const avgProtein = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l.protein_g ?? 0), 0) / byDate.size)
    : 0

  const context = profile
    ? `Goal: ${profile.goal}. Target: ${profile.target_calories}kcal, ${profile.target_protein_g}g protein. Last 7 days avg: ${avgCalories}kcal, ${avgProtein}g protein. Days logged: ${byDate.size}/7.`
    : `Last 7 days avg: ${avgCalories}kcal, ${avgProtein}g protein. Days logged: ${byDate.size}/7.`

  let tip: string
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
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `${context}\n\nGive ONE short nutrition tip for this user based on their data. Max 2 sentences. Specific and actionable. Respond in Portuguese (PT).`,
        }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    tip = (data.content?.[0]?.text as string) ?? ''
  } catch (err) {
    console.error('Nutrition tip error:', err)
    return NextResponse.json({ tip: null })
  }

  tipCache.set(cacheKey, { tip, date: today })

  return NextResponse.json({ tip })
}

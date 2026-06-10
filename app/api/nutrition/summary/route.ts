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

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '7d'
  const days = period === '30d' ? 30 : 7

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const [logsRes, weightRes, profileRes] = await Promise.all([
    supabase
      .from('food_logs')
      .select('date,calories,protein_g,carbs_g,fat_g')
      .eq('user_id', userRow.id)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('weight_logs')
      .select('date,weight_kg')
      .eq('user_id', userRow.id)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('nutrition_profiles')
      .select('target_calories')
      .eq('user_id', userRow.id)
      .single(),
  ])

  const logs = logsRes.data ?? []
  const weightLogs = weightRes.data ?? []
  const targetCalories = profileRes.data?.target_calories ?? 2150

  // Aggregate logs by date
  const byDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>()
  for (const log of logs) {
    const existing = byDate.get(log.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
    byDate.set(log.date, {
      calories: existing.calories + (log.calories ?? 0),
      protein:  existing.protein  + (log.protein_g ?? 0),
      carbs:    existing.carbs    + (log.carbs_g ?? 0),
      fat:      existing.fat      + (log.fat_g ?? 0),
    })
  }

  const dateEntries = Array.from(byDate.values())
  const n = dateEntries.length || 1

  const avgCalories = dateEntries.reduce((s, d) => s + d.calories, 0) / n
  const avgProtein  = dateEntries.reduce((s, d) => s + d.protein, 0) / n
  const avgCarbs    = dateEntries.reduce((s, d) => s + d.carbs, 0) / n
  const avgFat      = dateEntries.reduce((s, d) => s + d.fat, 0) / n

  const adherenceRate = dateEntries.length > 0
    ? (dateEntries.filter(d => d.calories >= targetCalories * 0.9 && d.calories <= targetCalories * 1.1).length / dateEntries.length) * 100
    : 0

  const caloriesTrend = Array.from(byDate.entries()).map(([date, d]) => ({
    date,
    calories: Math.round(d.calories),
    target: targetCalories,
  }))

  const weightTrend = weightLogs.map(w => ({ date: w.date, weight: w.weight_kg }))

  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : null
  const startWeight   = weightLogs.length > 0 ? weightLogs[0].weight_kg : null
  const weightChange  = currentWeight != null && startWeight != null ? currentWeight - startWeight : null

  return NextResponse.json({
    avgCalories: Math.round(avgCalories),
    avgProtein:  Math.round(avgProtein),
    avgCarbs:    Math.round(avgCarbs),
    avgFat:      Math.round(avgFat),
    adherenceRate: Math.round(adherenceRate),
    weightTrend,
    caloriesTrend,
    currentWeight,
    weightChange,
  })
}

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
  const period = searchParams.get('period') ?? '30d'
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: rows, error } = await supabase
    .from('braosa_kpis')
    .select('*')
    .eq('user_id', userRow.id)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history: Record<string, { date: string; value: number }[]> = {}
  const latestByMetric: Record<string, { value: number; date: string; row: typeof rows[0] }> = {}

  for (const row of rows ?? []) {
    if (!history[row.metric]) history[row.metric] = []
    history[row.metric].push({ date: row.date, value: Number(row.value) })
    if (!latestByMetric[row.metric] || row.date > latestByMetric[row.metric].date) {
      latestByMetric[row.metric] = { value: Number(row.value), date: row.date, row }
    }
  }

  // Compute change vs 7 days ago
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0]

  const latest: Record<string, { value: number; date: string; change?: number; label?: string }> = {}
  for (const [metric, info] of Object.entries(latestByMetric)) {
    const histArr = history[metric] ?? []
    // Find closest value at or before 7 days ago
    const older = histArr.filter(h => h.date <= sevenDaysStr)
    const olderVal = older.length > 0 ? older[older.length - 1].value : null
    let change: number | undefined
    if (olderVal !== null && olderVal !== 0) {
      change = ((info.value - olderVal) / Math.abs(olderVal)) * 100
    }
    latest[metric] = { value: info.value, date: info.date, change, label: info.row.label ?? undefined }
  }

  return NextResponse.json({ latest, history })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { metric, value, date, label } = body
  if (!metric || value === undefined) {
    return NextResponse.json({ error: 'metric and value required' }, { status: 400 })
  }

  const kpiDate = date ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('braosa_kpis')
    .upsert(
      { user_id: userRow.id, metric, value: Number(value), date: kpiDate, label: label ?? null, source: 'manual' },
      { onConflict: 'user_id,date,metric' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ kpi: data })
}

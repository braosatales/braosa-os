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

function periodToStartDate(period: string | null): string | null {
  const now = new Date()
  if (period === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
  }
  if (period === '90d') {
    const d = new Date(now); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0]
  }
  if (period === '1y') {
    const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]
  }
  return null
}

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period')
  const type = searchParams.get('type')
  const startDate = periodToStartDate(period)

  let query = supabase
    .from('verum_financials')
    .select('*')
    .eq('user_id', userRow.id)
    .order('date', { ascending: false })

  if (startDate) query = query.gte('date', startDate)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entries = data ?? []
  const totalRevenue = entries.filter(e => e.type === 'revenue' || e.type === 'invoice').reduce((sum, e) => sum + e.amount, 0)
  const totalExpenses = entries.filter(e => e.type === 'expense' || e.type === 'payroll').reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  // byMonth: last 6 months
  const monthMap: Record<string, { revenue: number; expenses: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    monthMap[key] = { revenue: 0, expenses: 0 }
  }
  for (const e of entries) {
    const key = e.date.slice(0, 7)
    if (!monthMap[key]) continue
    if (e.type === 'revenue' || e.type === 'invoice') monthMap[key].revenue += e.amount
    if (e.type === 'expense' || e.type === 'payroll') monthMap[key].expenses += e.amount
  }
  const byMonth = Object.entries(monthMap).map(([month, v]) => ({ month, ...v }))

  return NextResponse.json({ entries, summary: { totalRevenue, totalExpenses, netProfit, byMonth } })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, type, amount, description, project_id, category, notes } = body

  if (!type || !amount || !description) return NextResponse.json({ error: 'type, amount, description required' }, { status: 400 })

  const { data, error } = await supabase
    .from('verum_financials')
    .insert({
      user_id: userRow.id,
      date: date ?? new Date().toISOString().split('T')[0],
      type,
      amount,
      description,
      project_id: project_id ?? null,
      category: category ?? null,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

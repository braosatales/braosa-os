import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

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

  const [accountsRes, investmentsRes, debtsRes, budgetsRes] = await Promise.all([
    supabase.from('finance_accounts').select('balance').eq('user_id', userRow.id),
    supabase.from('finance_investments').select('current_value').eq('user_id', userRow.id),
    supabase.from('finance_debts').select('balance').eq('user_id', userRow.id),
    supabase.from('finance_budgets').select('category, spent, limit_amount').eq('user_id', userRow.id),
  ])

  const totalCash = (accountsRes.data ?? []).reduce((s, r) => s + (r.balance ?? 0), 0)
  const totalInvest = (investmentsRes.data ?? []).reduce((s, r) => s + (r.current_value ?? 0), 0)
  const totalDebt = (debtsRes.data ?? []).reduce((s, r) => s + (r.balance ?? 0), 0)
  const totalAssets = totalCash + totalInvest
  const netWorth = totalAssets - totalDebt

  const budgets = (budgetsRes.data ?? []).map((r) => ({
    cat: r.category as string,
    spent: r.spent as number,
    limit: r.limit_amount as number,
  }))

  return NextResponse.json({
    netWorth,
    totalAssets,
    totalCash,
    totalInvest,
    totalDebt,
    budgets,
    updatedAt: new Date().toISOString(),
  })
}

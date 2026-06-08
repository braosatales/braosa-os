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

  const uid = userRow.id

  const [
    { data: accounts },
    { data: debts },
    { data: investments },
    { data: budgets },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase.from('finance_accounts').select('*').eq('user_id', uid),
    supabase.from('finance_debts').select('*').eq('user_id', uid),
    supabase.from('finance_investments').select('*').eq('user_id', uid),
    supabase.from('finance_budgets').select('*').eq('user_id', uid),
    supabase.from('finance_transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(30),
  ])

  const totalCash = (accounts ?? []).reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalInvest = (investments ?? []).reduce((s, i) => s + (i.current_value ?? 0), 0)
  const totalDebt = (debts ?? []).reduce((s, d) => s + (d.balance ?? 0), 0)
  const totalAssets = totalCash + totalInvest
  const netWorth = totalAssets - totalDebt

  return NextResponse.json({
    accounts: accounts ?? [],
    debts: debts ?? [],
    investments: investments ?? [],
    budgets: budgets ?? [],
    recentTransactions: recentTransactions ?? [],
    totals: { totalCash, totalInvest, totalDebt, totalAssets, netWorth },
  })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [
    { data: accounts },
    { data: debts },
    { data: investments },
    { data: budgets },
  ] = await Promise.all([
    supabase.from('finance_accounts').select('*').eq('user_id', userRow.id),
    supabase.from('finance_debts').select('*').eq('user_id', userRow.id).eq('is_active', true),
    supabase.from('finance_investments').select('*').eq('user_id', userRow.id).eq('is_active', true),
    supabase.from('finance_budgets').select('*').eq('user_id', userRow.id).eq('is_active', true),
  ])

  const totalAssets = (accounts ?? []).reduce((s, a) => s + Number(a.balance ?? 0), 0)
    + (investments ?? []).reduce((s, i) => s + Number(i.current_value ?? 0), 0)
  const totalDebt = (debts ?? []).reduce((s, d) => s + Number(d.balance ?? 0), 0)
  const netWorth = totalAssets - totalDebt

  return NextResponse.json({
    net_worth: netWorth,
    total_assets: totalAssets,
    total_debt: totalDebt,
    accounts: accounts ?? [],
    debts: debts ?? [],
    investments: investments ?? [],
    budgets: budgets ?? [],
  })
}

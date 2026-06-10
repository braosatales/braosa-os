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
  const accountId = searchParams.get('accountId')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  let query = supabase
    .from('finance_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userRow.id)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (accountId) query = query.eq('account_id', accountId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data ?? [], total: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  console.log('POST /api/finances/transactions USER:', userRow?.id)
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  console.log('POST /api/finances/transactions BODY:', body)
  const { account_id, date, description, amount, category, notes } = body

  const { data, error } = await supabase
    .from('finance_transactions')
    .insert({ account_id, date, description, amount, category, notes, user_id: userRow.id })
    .select()
    .single()

  if (error) { console.log('POST /api/finances/transactions ERROR:', error); return NextResponse.json({ error: error.message, details: error }, { status: 500 }) }

  const { data: acct } = await supabase
    .from('finance_accounts')
    .select('balance')
    .eq('id', account_id)
    .eq('user_id', userRow.id)
    .single()

  if (acct) {
    await supabase
      .from('finance_accounts')
      .update({ balance: acct.balance + amount })
      .eq('id', account_id)
      .eq('user_id', userRow.id)
  }

  return NextResponse.json({ ok: true, transaction: data }, { status: 201 })
}

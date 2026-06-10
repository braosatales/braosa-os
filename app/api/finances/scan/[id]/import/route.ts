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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: scanId } = await params

  const { data: scan } = await supabase
    .from('invoice_scans')
    .select('id, user_id, status')
    .eq('id', scanId)
    .eq('user_id', userRow.id)
    .single()

  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  const body = await request.json()
  const { account_id, vendor, date, total, category, description, notes } = body

  const amount = typeof total === 'number' ? (total > 0 ? -total : total) : parseFloat(total)

  const { data: transaction, error: txError } = await supabase
    .from('finance_transactions')
    .insert({
      account_id,
      user_id: userRow.id,
      date,
      description: `${vendor} — ${description}`,
      amount,
      category,
      notes: notes || null,
      external_id: `scan_${scanId}`,
    })
    .select()
    .single()

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

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

  await supabase
    .from('invoice_scans')
    .update({ status: 'imported', finance_transaction_id: transaction.id })
    .eq('id', scanId)

  return NextResponse.json({ transaction })
}

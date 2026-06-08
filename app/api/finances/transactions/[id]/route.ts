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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { description, amount, category, notes, date } = body

  if (typeof amount === 'number') {
    const { data: oldTx } = await supabase
      .from('finance_transactions')
      .select('amount, account_id')
      .eq('id', id)
      .eq('user_id', userRow.id)
      .single()

    if (oldTx) {
      const delta = amount - oldTx.amount
      const { data: acct } = await supabase
        .from('finance_accounts')
        .select('balance')
        .eq('id', oldTx.account_id)
        .eq('user_id', userRow.id)
        .single()

      if (acct) {
        await supabase
          .from('finance_accounts')
          .update({ balance: acct.balance + delta })
          .eq('id', oldTx.account_id)
          .eq('user_id', userRow.id)
      }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (description !== undefined) updateData.description = description
  if (amount !== undefined) updateData.amount = amount
  if (category !== undefined) updateData.category = category
  if (notes !== undefined) updateData.notes = notes
  if (date !== undefined) updateData.date = date

  const { data, error } = await supabase
    .from('finance_transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userRow.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, transaction: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: oldTx } = await supabase
    .from('finance_transactions')
    .select('amount, account_id')
    .eq('id', id)
    .eq('user_id', userRow.id)
    .single()

  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userRow.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (oldTx) {
    const { data: acct } = await supabase
      .from('finance_accounts')
      .select('balance')
      .eq('id', oldTx.account_id)
      .eq('user_id', userRow.id)
      .single()

    if (acct) {
      await supabase
        .from('finance_accounts')
        .update({ balance: acct.balance - oldTx.amount })
        .eq('id', oldTx.account_id)
        .eq('user_id', userRow.id)
    }
  }

  return NextResponse.json({ ok: true })
}

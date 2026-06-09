import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { gcFetch } from '@/lib/gocardless'

async function resolveUser(request: NextRequest) {
  const supabase = createServiceClient()

  // Internal callback path: no cookie session, uses _serviceUserId in body
  const body = await request.clone().json().catch(() => ({}))
  if (body._serviceUserId) {
    return { userId: body._serviceUserId as string, connectionId: body.connectionId ?? null, supabase, internal: true }
  }

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null

  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return null

  return { userId: userRow.id as string, connectionId: body.connectionId ?? null, supabase, internal: false }
}

export async function POST(request: NextRequest) {
  const ctx = await resolveUser(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, connectionId, supabase } = ctx

  let connectionsQuery = supabase
    .from('bank_connections')
    .select('id, requisition_id, institution_name, status')
    .eq('user_id', userId)
    .eq('status', 'linked')

  if (connectionId) {
    connectionsQuery = connectionsQuery.eq('id', connectionId)
  }

  const { data: connections } = await connectionsQuery
  if (!connections || connections.length === 0) {
    return NextResponse.json({ synced: 0, newTransactions: 0 })
  }

  let totalSynced = 0
  let totalNew = 0

  for (const conn of connections) {
    const { data: links } = await supabase
      .from('bank_account_links')
      .select('id, gocardless_account_id, finance_account_id, currency')
      .eq('bank_connection_id', conn.id)

    if (!links) continue

    for (const link of links) {
      if (!link.finance_account_id) continue

      try {
        // 1. Update balance
        const balancesData = await gcFetch(`/accounts/${link.gocardless_account_id}/balances/`)
        const balances: Array<{ balanceAmount: { amount: string; currency: string }; balanceType: string }> =
          balancesData.balances ?? []

        const bal =
          balances.find(b => b.balanceType === 'interimAvailable') ??
          balances.find(b => b.balanceType === 'closingBooked') ??
          balances[0]

        if (bal) {
          await supabase
            .from('finance_accounts')
            .update({ balance: parseFloat(bal.balanceAmount.amount) })
            .eq('id', link.finance_account_id)
            .eq('user_id', userId)
        }

        // 2. Fetch transactions from last 30 days
        const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        const txData = await gcFetch(
          `/accounts/${link.gocardless_account_id}/transactions/?date_from=${dateFrom}`
        )
        const booked: Array<{
          transactionId?: string
          bookingDate: string
          transactionAmount: { amount: string; currency: string }
          creditorName?: string
          debtorName?: string
          remittanceInformationUnstructured?: string
        }> = txData.transactions?.booked ?? []

        for (const tx of booked) {
          const externalId = tx.transactionId
          if (!externalId) continue

          const description =
            tx.creditorName ??
            tx.debtorName ??
            tx.remittanceInformationUnstructured ??
            'Transaction'

          const { error } = await supabase
            .from('finance_transactions')
            .insert({
              account_id: link.finance_account_id,
              user_id: userId,
              date: tx.bookingDate,
              description,
              amount: parseFloat(tx.transactionAmount.amount),
              category: null,
              external_id: externalId,
            })
            .select('id')
            .single()

          // Unique index violation = already imported
          if (!error) totalNew++
        }

        totalSynced++
      } catch {
        // Continue with other accounts if one fails
      }
    }

    await supabase
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', conn.id)
  }

  return NextResponse.json({ synced: totalSynced, newTransactions: totalNew })
}

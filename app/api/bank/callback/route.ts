import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { gcFetch } from '@/lib/gocardless'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!ref) {
    return NextResponse.redirect(`${appUrl}/finances?tab=accounts&error=missing_ref`)
  }

  const supabase = createServiceClient()

  // The reference is "{userId}_{timestamp}" — find connection by parsing userId prefix
  // We match on the requisition reference stored at connection creation time by querying
  // the GoCardless requisition directly using the ref param (requisition reference field).
  // GoCardless sends ?ref= as the reference we set during creation.
  const userId = ref.split('_')[0]

  const { data: connection } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!connection) {
    return NextResponse.redirect(`${appUrl}/finances?tab=accounts&error=not_found`)
  }

  try {
    const requisition = await gcFetch(`/requisitions/${connection.requisition_id}/`)
    const accountIds: string[] = requisition.accounts ?? []

    await supabase
      .from('bank_connections')
      .update({ status: 'linked', account_ids: accountIds })
      .eq('id', connection.id)

    for (const gcAccountId of accountIds) {
      const details = await gcFetch(`/accounts/${gcAccountId}/details/`)
      const account: { iban?: string; name?: string; currency?: string } = details.account ?? {}

      // Check if link already exists
      const { data: existingLink } = await supabase
        .from('bank_account_links')
        .select('id, finance_account_id')
        .eq('gocardless_account_id', gcAccountId)
        .single()

      if (!existingLink) {
        // Create finance_account
        const { data: finAcct } = await supabase
          .from('finance_accounts')
          .insert({
            user_id: userId,
            name: account.name || connection.institution_name,
            bank: connection.institution_name,
            balance: 0,
            type: 'checking',
          })
          .select('id')
          .single()

        await supabase.from('bank_account_links').insert({
          user_id: userId,
          bank_connection_id: connection.id,
          gocardless_account_id: gcAccountId,
          finance_account_id: finAcct?.id ?? null,
          account_name: account.name ?? null,
          iban: account.iban ?? null,
          currency: account.currency ?? 'EUR',
        })
      }
    }

    // Trigger initial sync
    await fetch(`${appUrl}/api/bank/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Pass connection id via internal header — service role bypasses auth
      body: JSON.stringify({ connectionId: connection.id, _serviceUserId: userId }),
    })
  } catch {
    await supabase
      .from('bank_connections')
      .update({ status: 'error' })
      .eq('id', connection.id)
    return NextResponse.redirect(`${appUrl}/finances?tab=accounts&error=sync_failed`)
  }

  return NextResponse.redirect(`${appUrl}/finances?tab=accounts&connected=true`)
}

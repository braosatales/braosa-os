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

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: connections, error } = await supabase
    .from('bank_connections')
    .select(`
      id, institution_id, institution_name, institution_logo,
      requisition_id, status, account_ids, created_at, last_synced_at,
      bank_account_links (
        id, gocardless_account_id, finance_account_id, account_name, iban, currency
      )
    `)
    .eq('user_id', userRow.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connections: connections ?? [] })
}

export async function DELETE(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { connectionId } = await request.json()
  if (!connectionId) return NextResponse.json({ error: 'connectionId required' }, { status: 400 })

  const { error } = await supabase
    .from('bank_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userRow.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

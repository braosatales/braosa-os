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

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  console.log('POST /api/finances/debts USER:', userRow?.id)
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  console.log('POST /api/finances/debts BODY:', body)
  const { data, error } = await supabase
    .from('finance_debts')
    .insert({ ...body, user_id: userRow.id })
    .select()
    .single()

  if (error) { console.log('POST /api/finances/debts ERROR:', error); return NextResponse.json({ error: error.message, details: error }, { status: 500 }) }
  return NextResponse.json({ ok: true, debt: data }, { status: 201 })
}

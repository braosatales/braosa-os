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
  console.log('PATCH /api/finances/budgets/:id USER:', userRow?.id)
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  console.log('PATCH /api/finances/budgets/:id BODY:', body)
  const { data, error } = await supabase
    .from('finance_budgets')
    .update(body)
    .eq('id', id)
    .eq('user_id', userRow.id)
    .select()
    .single()

  if (error) { console.log('PATCH /api/finances/budgets/:id ERROR:', error); return NextResponse.json({ error: error.message, details: error }, { status: 500 }) }
  return NextResponse.json({ ok: true, budget: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userRow, supabase } = await resolveUser()
  console.log('DELETE /api/finances/budgets/:id USER:', userRow?.id, 'id:', id)
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('finance_budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userRow.id)

  if (error) { console.log('DELETE /api/finances/budgets/:id ERROR:', error); return NextResponse.json({ error: error.message, details: error }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

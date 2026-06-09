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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: plan, error } = await supabase
    .from('training_plans')
    .select('*, planned_sessions(*)')
    .eq('id', id)
    .eq('user_id', userRow.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status, feedback } = body as { status?: string; feedback?: string }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (feedback !== undefined) updates.feedback = feedback

  const { data: plan, error } = await supabase
    .from('training_plans')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userRow.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, plan })
}

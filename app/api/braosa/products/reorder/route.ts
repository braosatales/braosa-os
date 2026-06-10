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

export async function PUT(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { products } = body as { products: { id: string; order_index: number }[] }
  if (!Array.isArray(products)) return NextResponse.json({ error: 'products array required' }, { status: 400 })

  const updates = products.map(({ id, order_index }) =>
    supabase
      .from('braosa_products')
      .update({ order_index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userRow.id)
  )

  await Promise.all(updates)
  return NextResponse.json({ ok: true })
}

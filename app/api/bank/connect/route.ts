import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { gcFetch } from '@/lib/gocardless'

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
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { institutionId, institutionName, institutionLogo } = await request.json()
  if (!institutionId || !institutionName) {
    return NextResponse.json({ error: 'institutionId and institutionName required' }, { status: 400 })
  }

  const reference = `${userRow.id}_${Date.now()}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const requisition = await gcFetch('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      redirect: `${appUrl}/api/bank/callback`,
      institution_id: institutionId,
      reference,
      user_language: 'PT',
    }),
  })

  const { error } = await supabase.from('bank_connections').insert({
    user_id: userRow.id,
    institution_id: institutionId,
    institution_name: institutionName,
    institution_logo: institutionLogo ?? null,
    requisition_id: requisition.id,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ link: requisition.link })
}

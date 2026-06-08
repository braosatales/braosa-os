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
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { messages } = body as { messages: { role: string; content: string }[] }

  await supabase.from('ai_conversations').insert({
    user_id: userRow.id,
    messages,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({
    content: 'Estou a processar o teu pedido. A integração de IA completa será ativada em breve. Por enquanto, podes usar esta interface para testar o layout.',
  })
}

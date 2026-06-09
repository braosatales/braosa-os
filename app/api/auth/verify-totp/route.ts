import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { setDeviceTrust } from '@/lib/device-trust'

export async function POST(request: Request) {
  const { code, factorId } = await request.json()
  if (!code || !factorId) {
    return NextResponse.json({ error: 'Missing code or factorId' }, { status: 400 })
  }
  const supabase = await createClient()

  const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId })
  if (ce) return NextResponse.json({ error: ce.message }, { status: 400 })

  const { error: ve } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
  if (ve) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })

  const response = NextResponse.json({ success: true })
  setDeviceTrust(response)
  return response
}

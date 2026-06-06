import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { factorId, code } = await request.json()
  if (!factorId || !code) return NextResponse.json({ error: 'Missing factorId or code' }, { status: 400 })
  const supabase = await createClient()
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return NextResponse.json({ error: challengeError.message }, { status: 400 })
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId, challengeId: challengeData.id, code,
  })
  if (verifyError) return NextResponse.json({ error: verifyError.message }, { status: 401 })
  return NextResponse.json({ ok: true })
}

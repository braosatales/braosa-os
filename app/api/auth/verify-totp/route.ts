import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { setDeviceTrust } from '@/lib/device-trust'

export async function POST(request: Request) {
  const { code, factorId } = await request.json()
  if (!code || !factorId) {
    return NextResponse.json({ error: 'Missing code or factorId' }, { status: 400 })
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }
  const response = NextResponse.json({ success: true })
  setDeviceTrust(response)
  return response
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEVICE_TRUST_COOKIE } from '@/lib/device-trust'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEVICE_TRUST_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}

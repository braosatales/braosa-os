import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Braosa OS' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
}

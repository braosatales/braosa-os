import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.[0] ?? null
  return NextResponse.json({
    hasMfa: totpFactor !== null,
    factorId: totpFactor?.id ?? null,
  })
}

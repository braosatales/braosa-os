import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.listFactors()
  const totpFactor = data?.totp?.find(f => f.status === 'verified') ?? null
  return NextResponse.json({
    hasMfa: totpFactor !== null,
    factorId: totpFactor?.id ?? null,
  })
}

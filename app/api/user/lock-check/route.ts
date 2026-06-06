import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { data } = await supabase
    .from('users')
    .select('lock_password')
    .eq('supabase_uid', user.id)
    .maybeSingle()

  if (!data) return NextResponse.json({ ok: false }, { status: 404 })

  const ok = data.lock_password === password
  return NextResponse.json({ ok })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (typeof body.password !== 'string') {
    return NextResponse.json({ valid: false })
  }

  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('users')
    .select('lock_password')
    .eq('supabase_uid', user.id)
    .single()

  const stored = row?.lock_password
  const isBcryptHash = !!stored && (stored.startsWith('$2b$') || stored.startsWith('$2a$'))

  if (!isBcryptHash) {
    return NextResponse.json({ valid: false, requiresSetup: true })
  }

  const valid = await bcrypt.compare(body.password, stored)

  return NextResponse.json({ valid })
}

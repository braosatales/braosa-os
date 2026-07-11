import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('users')
    .select('lock_password')
    .eq('supabase_uid', user.id)
    .single()

  const stored = row?.lock_password
  const isBcryptHash = !!stored && (stored.startsWith('$2b$') || stored.startsWith('$2a$'))

  return NextResponse.json({ hasPassword: isBcryptHash })
}

export async function PATCH(request: Request) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (typeof body.password !== 'string' || !body.password.trim()) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
  }

  const hash = await bcrypt.hash(body.password.trim(), 10)

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({ lock_password: hash })
    .eq('supabase_uid', user.id)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({ lock_password: null })
    .eq('supabase_uid', user.id)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

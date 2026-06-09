import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { gcFetch } from '@/lib/gocardless'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await gcFetch('/institutions/?country=pt')
    return NextResponse.json({ institutions: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

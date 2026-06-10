import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const disconnected = { connected: false, email: null, name: null, picture: null, scopes: [] }

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json(disconnected)

  const supabase = createServiceClient()
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single()
  if (!userRow) return NextResponse.json(disconnected)

  const { data } = await supabase
    .from('google_connections')
    .select('google_email, google_name, google_picture, scopes')
    .eq('user_id', userRow.id)
    .single()

  if (!data) return NextResponse.json(disconnected)

  return NextResponse.json({
    connected: true,
    email: data.google_email,
    name: data.google_name,
    picture: data.google_picture,
    scopes: data.scopes ?? [],
  })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { refreshSpotifyToken } from '@/lib/spotify'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json({ playlists: [], error: 'Spotify not configured' })
  }

  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await refreshSpotifyToken(userRow.id, supabase)
  if (!token) return NextResponse.json({ playlists: [] })

  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return NextResponse.json({ playlists: [] })

  const data = await res.json()
  const playlists = (data.items ?? []).map((p: { id: string; name: string; images: { url: string }[] }) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.images?.[0]?.url ?? null,
  }))

  return NextResponse.json({ playlists })
}

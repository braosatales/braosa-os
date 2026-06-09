import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
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
    return NextResponse.json({ isPlaying: false, error: 'Spotify not configured' })
  }

  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ isPlaying: false, error: 'Unauthorized' })

  const token = await refreshSpotifyToken(userRow.id, supabase)
  if (!token) return NextResponse.json({ isPlaying: false, connected: false })

  const res = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 204 || res.status === 404) {
    return NextResponse.json({ isPlaying: false, connected: true })
  }

  if (!res.ok) {
    return NextResponse.json({ isPlaying: false, connected: true, error: 'Player unavailable' })
  }

  const data = await res.json()
  const track = data.item
  return NextResponse.json({
    connected: true,
    isPlaying: data.is_playing ?? false,
    trackName: track?.name ?? null,
    artistName: track?.artists?.map((a: { name: string }) => a.name).join(', ') ?? null,
    albumArt: track?.album?.images?.[2]?.url ?? track?.album?.images?.[0]?.url ?? null,
    progressMs: data.progress_ms ?? 0,
    durationMs: track?.duration_ms ?? 0,
  })
}

export async function POST(request: NextRequest) {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 503 })
  }

  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await refreshSpotifyToken(userRow.id, supabase)
  if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  const { action } = await request.json()

  let spotifyUrl: string
  let method: string

  switch (action) {
    case 'play':
      spotifyUrl = 'https://api.spotify.com/v1/me/player/play'
      method = 'PUT'
      break
    case 'pause':
      spotifyUrl = 'https://api.spotify.com/v1/me/player/pause'
      method = 'PUT'
      break
    case 'next':
      spotifyUrl = 'https://api.spotify.com/v1/me/player/next'
      method = 'POST'
      break
    case 'previous':
      spotifyUrl = 'https://api.spotify.com/v1/me/player/previous'
      method = 'POST'
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await fetch(spotifyUrl, { method, headers: { Authorization: `Bearer ${token}` } })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'

export async function GET() {
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
  if (!SPOTIFY_CLIENT_ID) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 503 })
  }

  const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI
    ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/spotify/callback`

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'user-read-playback-state user-modify-playback-state playlist-read-private user-read-currently-playing',
    state: crypto.randomUUID(),
  })

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
}

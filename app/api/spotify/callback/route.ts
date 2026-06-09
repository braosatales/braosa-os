import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/health?spotify=error`)
  }

  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? ''
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''
  const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? `${APP_URL}/api/spotify/callback`

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/health?spotify=error`)

  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  if (!userRow) return NextResponse.redirect(`${APP_URL}/health?spotify=error`)

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  })
  const tokens = await tokenRes.json()
  if (!tokens.access_token) return NextResponse.redirect(`${APP_URL}/health?spotify=error`)

  const userRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const spotifyUser = await userRes.json()

  await supabase.from('spotify_connections').upsert({
    user_id: userRow.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    spotify_user_id: spotifyUser.id ?? null,
    display_name: spotifyUser.display_name ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${APP_URL}/health`)
}

export async function refreshSpotifyToken(userId: string, supabase: ReturnType<typeof import('@/lib/supabase/service').createServiceClient>): Promise<string | null> {
  const { data: conn } = await supabase.from('spotify_connections').select('*').eq('user_id', userId).single()
  if (!conn) return null
  if (new Date(conn.expires_at) > new Date(Date.now() + 60000)) return conn.access_token
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
  })
  const tokens = await res.json()
  if (!tokens.access_token) return conn.access_token
  await supabase.from('spotify_connections').update({
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return tokens.access_token
}

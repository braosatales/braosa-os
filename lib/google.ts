import { createServiceClient } from '@/lib/supabase/service'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/drive',
  'openid',
  'email',
  'profile',
].join(' ')

export async function refreshGoogleToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('google_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!data) return null

  const expiresAt = new Date(data.expires_at).getTime()
  if (expiresAt > Date.now() + 60_000) return data.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  })

  const tokens = await res.json()
  if (!tokens.access_token) return null

  await supabase
    .from('google_connections')
    .update({
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return tokens.access_token
}

export async function googleFetch(userId: string, url: string, options?: RequestInit): Promise<any> {
  let token = await refreshGoogleToken(userId)
  if (!token) throw new Error('Not connected to Google')

  const makeHeaders = (t: string) => {
    const h = new Headers(options?.headers)
    h.set('Authorization', `Bearer ${t}`)
    return h
  }

  let res = await fetch(url, { ...options, headers: makeHeaders(token) })

  if (res.status === 401) {
    // Force expiry and retry once
    const supabase = createServiceClient()
    await supabase
      .from('google_connections')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('user_id', userId)

    token = await refreshGoogleToken(userId)
    if (!token) throw new Error('Google token refresh failed')
    res = await fetch(url, { ...options, headers: makeHeaders(token) })
  }

  return res.json()
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('google_connections')
    .select('id')
    .eq('user_id', userId)
    .single()
  return !!data
}

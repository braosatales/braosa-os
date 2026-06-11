import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { GOOGLE_SCOPES } from '@/lib/google'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`

  const cookieStore = await cookies()
  const savedState = cookieStore.get('google-oauth-state')?.value

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/dashboard?google=error`)
  }

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  const supabase = createServiceClient()
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single()
  if (!userRow) return NextResponse.redirect(`${APP_URL}/dashboard?google=error`)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokens.access_token) return NextResponse.redirect(`${APP_URL}/dashboard?google=error`)

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const googleUser = await userInfoRes.json()

  await supabase.from('google_connections').upsert({
    user_id: userRow.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    google_email: googleUser.email ?? '',
    google_name: googleUser.name ?? null,
    google_picture: googleUser.picture ?? null,
    scopes: GOOGLE_SCOPES.split(' '),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  const response = NextResponse.redirect(`${APP_URL}/dashboard?google=connected`)
  response.cookies.delete('google-oauth-state')
  return response
}

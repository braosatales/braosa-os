import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { GOOGLE_SCOPES } from '@/lib/google'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google not configured' }, { status: 503 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const cookieStore = await cookies()
  cookieStore.set('google-oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${APP_URL}/api/google/callback`,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

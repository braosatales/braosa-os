import type { NextRequest, NextResponse } from 'next/server'

export const DEVICE_TRUST_COOKIE = 'braosa-device-trust'
export const DEVICE_TRUST_DAYS = 30

export function setDeviceTrust(response: NextResponse): void {
  response.cookies.set(DEVICE_TRUST_COOKIE, '1', {
    maxAge: DEVICE_TRUST_DAYS * 24 * 60 * 60,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })
}

export function getDeviceTrust(request: NextRequest): boolean {
  return request.cookies.get(DEVICE_TRUST_COOKIE)?.value === '1'
}

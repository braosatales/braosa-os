import { NextResponse } from 'next/server'
import { setDeviceTrust } from '@/lib/device-trust'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  setDeviceTrust(response)
  return response
}

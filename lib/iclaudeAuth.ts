import { NextRequest, NextResponse } from 'next/server'

export function verifyIClaudeKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const key = authHeader.replace('Bearer ', '').trim()
  return key === process.env.ICLAUDE_API_KEY
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

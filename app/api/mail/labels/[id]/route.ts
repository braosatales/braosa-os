import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, color } = body as { name?: string; color?: { backgroundColor: string; textColor: string } }

  try {
    const patchBody: any = {}
    if (name !== undefined) patchBody.name = name
    if (color !== undefined) patchBody.color = color

    const data = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/gmail/v1/users/me/labels/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      }
    )
    return NextResponse.json({ label: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

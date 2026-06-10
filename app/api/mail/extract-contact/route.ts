import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { parseEmailAddress } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null }
}

export async function POST(request: NextRequest) {
  const { userRow } = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { messageId } = await request.json()

  try {
    const msg = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From`
    )

    const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
    const fromRaw = headers.find(h => h.name.toLowerCase() === 'from')?.value ?? ''
    const parsed = parseEmailAddress(fromRaw)

    if (!parsed.email) return NextResponse.json({ contact: null, alreadyExists: false })

    // Check if contact already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userRow.id)
      .contains('email', [parsed.email])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ contact: null, alreadyExists: true })
    }

    // Parse name parts
    const nameParts = (parsed.name ?? parsed.email.split('@')[0]).split(' ')
    const first_name = nameParts[0] ?? parsed.email.split('@')[0]
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userRow.id,
        first_name,
        last_name,
        email: [parsed.email],
        phone: [],
        tags: [],
        source: 'email_extract',
        review_status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contact, alreadyExists: false })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

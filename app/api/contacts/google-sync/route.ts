import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function POST() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await googleFetch(
      userRow.id,
      'https://people.googleapis.com/v1/people/me/connections' +
        '?personFields=names,emailAddresses,phoneNumbers,photos,organizations,birthdays' +
        '&pageSize=1000',
    )

    const connections: any[] = result.connections ?? []
    let newCount = 0
    let updatedCount = 0

    const { data: existing } = await supabase
      .from('contacts')
      .select('id, google_contact_id')
      .eq('user_id', userRow.id)
      .not('google_contact_id', 'is', null)

    const existingMap = new Map(
      (existing ?? []).map((c: { id: string; google_contact_id: string }) => [c.google_contact_id, c.id]),
    )

    for (const person of connections) {
      const resourceName: string = person.resourceName
      const names: any[] = person.names ?? []
      const primaryName = names.find((n: any) => n.metadata?.primary) ?? names[0]
      if (!primaryName) continue

      const first_name: string = primaryName.givenName ?? primaryName.displayName ?? 'Unknown'
      const last_name: string | null = primaryName.familyName ?? null

      const email: string[] = (person.emailAddresses ?? []).map((e: any) => e.value).filter(Boolean)
      const phone: string[] = (person.phoneNumbers ?? []).map((p: any) => p.value).filter(Boolean)

      const photos: any[] = person.photos ?? []
      const primaryPhoto = photos.find((p: any) => p.metadata?.primary) ?? photos[0]
      const photo_url: string | null = primaryPhoto?.url ?? null

      const orgs: any[] = person.organizations ?? []
      const primaryOrg = orgs.find((o: any) => o.metadata?.primary) ?? orgs[0]
      const company: string | null = primaryOrg?.name ?? null
      const job_title: string | null = primaryOrg?.title ?? null

      const birthdays: any[] = person.birthdays ?? []
      const primaryBday = birthdays.find((b: any) => b.metadata?.primary) ?? birthdays[0]
      let birthday: string | null = null
      if (primaryBday?.date) {
        const { year, month, day } = primaryBday.date
        if (year && month && day) {
          birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }
      }

      const existingId = existingMap.get(resourceName)
      if (existingId) {
        await supabase
          .from('contacts')
          .update({
            first_name, last_name, email, phone, company, job_title,
            photo_url, birthday, updated_at: new Date().toISOString(),
          })
          .eq('id', existingId)
          .eq('user_id', userRow.id)
        updatedCount++
      } else {
        await supabase
          .from('contacts')
          .insert({
            user_id: userRow.id,
            google_contact_id: resourceName,
            first_name, last_name, email, phone, company, job_title,
            photo_url, birthday,
            tags: [], social_links: {},
            source: 'google',
            review_status: null,
          })
        newCount++
      }
    }

    return NextResponse.json({ synced: connections.length, new: newCount, updated: updatedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const tag = searchParams.get('tag')
  const sort = searchParams.get('sort') ?? 'name'

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userRow.id)
    .is('review_status', null)

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`,
    )
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  if (sort === 'recent') {
    query = query
      .order('last_contacted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
  } else {
    query = query
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true, nullsFirst: false })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    first_name, last_name, email, phone, company, job_title,
    photo_url, tags, notes, birthday, address, social_links,
    source, review_status, last_contacted_at,
  } = body

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: userRow.id,
      first_name,
      last_name: last_name ?? null,
      email: email ?? [],
      phone: phone ?? [],
      company: company ?? null,
      job_title: job_title ?? null,
      photo_url: photo_url ?? null,
      tags: tags ?? [],
      notes: notes ?? null,
      birthday: birthday ?? null,
      address: address ?? null,
      social_links: social_links ?? {},
      source: source ?? 'manual',
      review_status: review_status ?? null,
      last_contacted_at: last_contacted_at ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data }, { status: 201 })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import type { Layout, WidgetId } from '@/lib/dashboard'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET(req: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const device = req.nextUrl.searchParams.get('device') ?? 'desktop'

  const { data } = await supabase
    .from('dashboard_layouts')
    .select('layout, visible_widgets')
    .eq('user_id', userRow.id)
    .eq('device', device)
    .single()

  if (!data) {
    return NextResponse.json({ layout: {}, visibleWidgets: [], fresh: true, device })
  }

  return NextResponse.json({
    layout: data.layout as Layout,
    visibleWidgets: (data.visible_widgets ?? []) as WidgetId[],
    fresh: false,
    device,
  })
}

export async function POST(req: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    device: 'desktop' | 'mobile'
    layout: Layout
    visibleWidgets: WidgetId[]
  }

  const { error } = await supabase
    .from('dashboard_layouts')
    .upsert(
      {
        user_id: userRow.id,
        device: body.device,
        layout: body.layout,
        visible_widgets: body.visibleWidgets,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device' }
    )

  if (error) {
    console.error('[dashboard/layout] upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const muscle_group = searchParams.get('muscle_group')
  const equipment = searchParams.get('equipment')
  const type = searchParams.get('type')
  const search = searchParams.get('search')

  let query = supabase.from('exercises').select('*')

  if (muscle_group) {
    query = query.contains('muscle_groups', [muscle_group])
  }
  if (equipment) {
    const equipmentArray = equipment.split(',').map(e => e.trim()).filter(Boolean)
    if (equipmentArray.length > 0) {
      query = query.overlaps('equipment_needed', equipmentArray)
    }
  }
  if (type) {
    query = query.eq('type', type)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,name_pt.ilike.%${search}%`)
  }

  const { data, error } = await query.order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercises: data ?? [] })
}

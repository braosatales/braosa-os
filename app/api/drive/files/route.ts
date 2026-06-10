import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

export async function GET(request: NextRequest) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folderId')
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 })

  try {
    const q = `'${folderId}' in parents and trashed=false`
    const fields = 'files(id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink)'
    const data = await googleFetch(
      userRow.id as string,
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`
    )

    return NextResponse.json({ files: data.files ?? [], folderId })
  } catch (err: any) {
    console.error('drive files GET error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to list files' }, { status: 500 })
  }
}

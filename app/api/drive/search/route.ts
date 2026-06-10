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

  const userId = userRow.id as string
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const rootIdsParam = searchParams.get('rootIds') ?? 'rrr,braosa-universe'

  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })

  const rootIds = rootIdsParam.split(',').map(s => s.trim()).filter(Boolean)

  try {
    // Get folder IDs from cache
    const supabase = createServiceClient()
    const { data: cached } = await supabase
      .from('drive_folder_cache')
      .select('root_id, folder_id')
      .eq('user_id', userId)
      .in('root_id', rootIds)

    const folderMap: Record<string, string> = {}
    for (const row of cached ?? []) {
      folderMap[row.root_id as string] = row.folder_id as string
    }

    const folderIds = Object.values(folderMap)
    if (folderIds.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Build query: fullText contains q, in any of the root folders
    const folderConditions = folderIds.map(id => `'${id}' in parents`).join(' or ')
    const driveQ = `fullText contains '${q.replace(/'/g, "\\'")}' and (${folderConditions}) and trashed=false`
    const fields = 'files(id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink)'

    const data = await googleFetch(
      userId,
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(driveQ)}&fields=${encodeURIComponent(fields)}&pageSize=30`
    )

    // Tag each result with its rootId
    const files = (data.files ?? []).map((file: any) => {
      let rootId: string | null = null
      for (const [rid, fid] of Object.entries(folderMap)) {
        if ((file.parents ?? []).includes(fid)) {
          rootId = rid
          break
        }
      }
      return { ...file, rootId }
    })

    return NextResponse.json({ results: files })
  } catch (err: any) {
    console.error('drive search GET error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to search' }, { status: 500 })
  }
}

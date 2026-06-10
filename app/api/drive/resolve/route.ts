import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch } from '@/lib/google'
import { NextResponse } from 'next/server'
import { FOLDER_MIME } from '@/lib/drive'

const ROOT_PATHS: Record<string, string[]> = {
  rrr: ['iClaude OS', '00_Resources', 'Rodrigues Research Repository'],
  'braosa-universe': ['iClaude OS', '06_HQ_Creative', 'Creative Resources', 'Braosa Universe'],
}

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

async function findFolderByPath(userId: string, pathParts: string[]): Promise<string | null> {
  let parentId = 'root'

  for (const part of pathParts) {
    const q = `name='${part.replace(/'/g, "\\'")}' and mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`
    const data = await googleFetch(
      userId,
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`
    )
    const files = data.files ?? []
    if (files.length === 0) return null
    parentId = files[0].id
  }

  return parentId
}

export async function POST() {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = userRow.id as string
  const supabase = createServiceClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: cached } = await supabase
    .from('drive_folder_cache')
    .select('root_id, folder_id, resolved_at')
    .eq('user_id', userId)
    .gt('resolved_at', sevenDaysAgo)

  const cachedMap: Record<string, string> = {}
  for (const row of cached ?? []) {
    cachedMap[row.root_id as string] = row.folder_id as string
  }

  const result: Record<string, string | null> = {
    rrr: cachedMap['rrr'] ?? null,
    'braosa-universe': cachedMap['braosa-universe'] ?? null,
  }

  const toResolve = Object.entries(ROOT_PATHS).filter(([id]) => !cachedMap[id])

  await Promise.all(
    toResolve.map(async ([rootId, pathParts]) => {
      try {
        const folderId = await findFolderByPath(userId, pathParts)
        result[rootId] = folderId

        if (folderId) {
          await supabase
            .from('drive_folder_cache')
            .upsert({
              user_id: userId,
              root_id: rootId,
              folder_id: folderId,
              folder_path: pathParts.join('/'),
              resolved_at: new Date().toISOString(),
            }, { onConflict: 'user_id,root_id' })
        }
      } catch {
        result[rootId] = null
      }
    })
  )

  return NextResponse.json(result)
}

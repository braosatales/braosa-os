import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch, refreshGoogleToken } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'
import { FOLDER_MIME, MARKDOWN_MIME } from '@/lib/drive'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

export async function POST(request: NextRequest) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = userRow.id as string

  try {
    const body = await request.json()
    const { name, mimeType, parentId, content } = body

    if (!name || !mimeType || !parentId) {
      return NextResponse.json({ error: 'name, mimeType, parentId required' }, { status: 400 })
    }

    if (mimeType === FOLDER_MIME) {
      const file = await googleFetch(
        userId,
        `https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink,trashed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
        }
      )
      return NextResponse.json({ file })
    }

    // Markdown file: use multipart upload
    const token = await refreshGoogleToken(userId)
    if (!token) return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 })

    const metadata = JSON.stringify({
      name,
      mimeType: MARKDOWN_MIME,
      parents: [parentId],
    })
    const fileContent = content ?? ''

    const boundary = 'drive_upload_boundary'
    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      `Content-Type: ${MARKDOWN_MIME}`,
      '',
      fileContent,
      `--${boundary}--`,
    ].join('\r\n')

    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink,trashed`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    )

    const file = await res.json()
    return NextResponse.json({ file })
  } catch (err: any) {
    console.error('drive create POST error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create file' }, { status: 500 })
  }
}

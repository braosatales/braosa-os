import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { googleFetch, refreshGoogleToken } from '@/lib/google'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return userRow ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = userRow.id as string

  try {
    const [file, contentRes] = await Promise.all([
      googleFetch(
        userId,
        `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink,trashed`
      ),
      (async () => {
        const token = await refreshGoogleToken(userId)
        if (!token) throw new Error('Not connected to Google')
        return fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      })(),
    ])

    const content = await contentRes.text()
    return NextResponse.json({ content, file })
  } catch (err: any) {
    console.error('drive file GET error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to read file' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = userRow.id as string

  try {
    const body = await request.json()
    const { content } = body

    if (content !== undefined) {
      // Update file content
      const token = await refreshGoogleToken(userId)
      if (!token) return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 })

      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&fields=id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink,trashed`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/markdown',
          },
          body: content,
        }
      )
      const file = await res.json()
      return NextResponse.json({ file })
    }

    // Otherwise update metadata (e.g. trashed)
    const file = await googleFetch(
      userId,
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink,trashed`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    return NextResponse.json({ file })
  } catch (err: any) {
    console.error('drive file PATCH error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update file' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRow = await resolveUser()
  if (!userRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = userRow.id as string

  try {
    const file = await googleFetch(
      userId,
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,parents,modifiedTime,createdTime,size,starred,webViewLink,iconLink,trashed`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      }
    )
    return NextResponse.json({ file })
  } catch (err: any) {
    console.error('drive file DELETE error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to trash file' }, { status: 500 })
  }
}

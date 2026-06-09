import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) return NextResponse.json({ videos: [] })

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ videos: [], error: 'YouTube API not configured' })
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(url)
    const json = await res.json()

    if (!res.ok) {
      return NextResponse.json({ videos: [], error: json.error?.message ?? 'YouTube API error' })
    }

    const videos = (json.items ?? []).map((item: { id: { videoId: string }; snippet: { title: string } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
    }))

    return NextResponse.json({ videos })
  } catch (e) {
    return NextResponse.json({ videos: [], error: String(e) })
  }
}

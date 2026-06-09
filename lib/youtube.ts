export async function searchExerciseVideo(query: string): Promise<{ videoId: string; title: string } | null> {
  try {
    const r = await fetch(`/api/health/youtube-search?q=${encodeURIComponent(query)}`)
    const { videos } = await r.json()
    return videos?.[0] ?? null
  } catch { return null }
}

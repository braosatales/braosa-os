export type OSUser = {
  id: string
  name: string
  email: string
  lifeScore: number
  level: number
  xpToNext: number
  streak: number
}

export async function getUser(): Promise<OSUser | null> {
  try {
    const res = await fetch("/api/user")
    if (!res.ok) return null
    const data = await res.json()
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      lifeScore: data.life_score ?? 0,
      level: data.level ?? 1,
      xpToNext: data.xp_to_next ?? 0,
      streak: data.streak ?? 0,
    }
  } catch {
    return null
  }
}

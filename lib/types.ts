export type OsUser = {
  id: string
  supabase_uid: string
  email: string
  full_name: string | null
  avatar_url: string | null
  language: 'en' | 'pt'
  life_score: number
  level: number
  xp_to_next: number
  streak: number
  streak_last_date: string | null
  lock_password: string
  idle_minutes: number
  created_at: string
  last_active: string
}

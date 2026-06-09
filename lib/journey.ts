export type PlannedExercise = {
  exercise_id: string; name: string; name_pt: string | null
  sets: number; reps: number | null; duration_seconds: number | null
  rest_seconds: number; notes: string | null; muscle_groups?: string[]
}

export type PlannedSession = {
  id: string; plan_id: string; user_id: string
  day_of_week: string; session_date: string
  session_name: string
  session_type: 'strength' | 'cardio' | 'hiit' | 'mobility' | 'rest'
  exercises: PlannedExercise[]
  estimated_duration: number | null; ai_notes: string | null
  status: 'pending' | 'completed' | 'skipped'; created_at: string
}

export type TrainingPlan = {
  id: string; user_id: string; week_start: string
  plan_data: { sessions: PlannedSession[] }
  ai_reasoning: string | null
  status: 'active' | 'completed' | 'skipped'
  feedback: string | null; created_at: string
}

export type SessionFeedback = 'too_easy' | 'just_right' | 'too_hard'

export const SESSION_TYPE_META: Record<string, { label_pt: string; label_en: string; color: string; glyph: string }> = {
  strength: { label_pt: "Força",      label_en: "Strength", color: "var(--c-health)", glyph: "activity"     },
  cardio:   { label_pt: "Cardio",     label_en: "Cardio",   color: "var(--pos)",      glyph: "trending-up"  },
  hiit:     { label_pt: "HIIT",       label_en: "HIIT",     color: "var(--neg)",      glyph: "flame"        },
  mobility: { label_pt: "Mobilidade", label_en: "Mobility", color: "var(--c-cal)",    glyph: "award"        },
  rest:     { label_pt: "Descanso",   label_en: "Rest",     color: "var(--ink-faint)",glyph: "check-circle" },
}

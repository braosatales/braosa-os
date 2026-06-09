export type Exercise = {
  id: string; name: string; name_pt: string | null
  muscle_groups: string[]; equipment_needed: string[]
  type: 'strength' | 'cardio' | 'mobility' | 'hiit'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string | null; youtube_search_query: string | null; created_at: string
}

export type Routine = {
  id: string; user_id: string; name: string; description: string | null
  target_days: string[]; estimated_duration: number | null
  created_at: string; updated_at: string
}

export type RoutineExercise = {
  id: string; routine_id: string; exercise_id: string; exercise?: Exercise
  order_index: number; sets: number; reps: number | null; duration_seconds: number | null
  rest_seconds: number; notes: string | null; is_superset: boolean; superset_group: number | null
}

export type VideoPreference = {
  id: string; user_id: string; exercise_id: string; youtube_video_id: string
  youtube_title: string | null; status: 'favourite' | 'flagged' | 'neutral'
  used_count: number; last_used_at: string | null
}

export const MUSCLE_GROUP_META: Record<string, { label_pt: string; label_en: string; color: string }> = {
  chest:     { label_pt: "Peito",      label_en: "Chest",      color: "var(--c-health)" },
  back:      { label_pt: "Costas",     label_en: "Back",       color: "var(--c-task)"   },
  shoulders: { label_pt: "Ombros",     label_en: "Shoulders",  color: "var(--c-fin)"    },
  biceps:    { label_pt: "Bíceps",     label_en: "Biceps",     color: "var(--c-braosa)" },
  triceps:   { label_pt: "Tríceps",    label_en: "Triceps",    color: "var(--c-verum)"  },
  legs:      { label_pt: "Pernas",     label_en: "Legs",       color: "var(--c-cal)"    },
  glutes:    { label_pt: "Glúteos",    label_en: "Glutes",     color: "var(--neg)"      },
  core:      { label_pt: "Core",       label_en: "Core",       color: "var(--c-mail)"   },
  cardio:    { label_pt: "Cardio",     label_en: "Cardio",     color: "var(--pos)"      },
  full_body: { label_pt: "Corpo Todo", label_en: "Full Body",  color: "var(--c-dash)"   },
}

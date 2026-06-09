export type WorkoutSession = {
  id: string; user_id: string; planned_session_id: string | null
  routine_id: string | null; name: string; session_type: string
  started_at: string; ended_at: string | null; duration_seconds: number | null
  notes: string | null; feedback: string | null; spotify_playlist_id: string | null
  created_at: string
}

export type SessionSet = {
  id: string; session_id: string; user_id: string
  exercise_id: string; exercise_name: string; set_number: number
  reps: number | null; weight_kg: number | null; duration_seconds: number | null
  rest_seconds: number | null; completed: boolean; notes: string | null
  is_pr: boolean; created_at: string
}

export type ActiveExercise = {
  exercise_id: string; exercise_name: string; exercise_name_pt: string | null
  sets: SessionSet[]; target_sets: number; target_reps: number | null
  target_duration_seconds: number | null; target_rest_seconds: number
  notes: string | null; youtube_video_id: string | null; youtube_title: string | null
}

export type ActiveWorkout = {
  session: WorkoutSession; exercises: ActiveExercise[]
  currentExerciseIndex: number; elapsedSeconds: number
}

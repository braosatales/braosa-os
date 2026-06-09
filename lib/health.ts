export type WorkoutGoal = 'build_muscle' | 'lose_fat' | 'improve_endurance' | 'stay_active' | 'athlete_performance'
export type Equipment = 'none' | 'dumbbells' | 'barbell_rack' | 'full_gym' | 'rings' | 'kettlebells' | 'cardio_machines'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type DayOfWeek = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export type WorkoutProfile = {
  id: string
  user_id: string
  goal: WorkoutGoal
  equipment: Equipment[]
  available_days: DayOfWeek[]
  sessions_per_week: number
  session_duration: number
  experience_level: ExperienceLevel
  injuries: string
  fitness_notes: string
  created_at: string
  updated_at: string
}

export const GOAL_META: Record<WorkoutGoal, { label_pt: string; label_en: string; icon: string; description_pt: string; description_en: string }> = {
  build_muscle:        { label_pt: "Ganhar Músculo",       label_en: "Build Muscle",        icon: "activity",     description_pt: "Hipertrofia e força",           description_en: "Hypertrophy and strength" },
  lose_fat:            { label_pt: "Perder Gordura",       label_en: "Lose Fat",            icon: "flame",        description_pt: "Queimar calorias e definir",    description_en: "Burn calories and define" },
  improve_endurance:   { label_pt: "Melhorar Resistência", label_en: "Improve Endurance",   icon: "trending-up",  description_pt: "Cardio e capacidade aeróbica",  description_en: "Cardio and aerobic capacity" },
  stay_active:         { label_pt: "Manter-me Ativo",      label_en: "Stay Active",         icon: "check-circle", description_pt: "Saúde geral e bem-estar",       description_en: "General health and wellbeing" },
  athlete_performance: { label_pt: "Performance Atlética", label_en: "Athlete Performance", icon: "award",        description_pt: "Rendimento e potência máximos", description_en: "Peak output and power" },
}

export const EQUIPMENT_META: Record<Equipment, { label_pt: string; label_en: string; icon: string }> = {
  none:            { label_pt: "Sem Equipamento",   label_en: "No Equipment",      icon: "user" },
  dumbbells:       { label_pt: "Halteres",           label_en: "Dumbbells",         icon: "activity" },
  barbell_rack:    { label_pt: "Barra + Rack",       label_en: "Barbell + Rack",    icon: "activity" },
  full_gym:        { label_pt: "Ginásio Completo",   label_en: "Full Gym",          icon: "building" },
  rings:           { label_pt: "Argolas",            label_en: "Rings",             icon: "award" },
  kettlebells:     { label_pt: "Kettlebells",        label_en: "Kettlebells",       icon: "activity" },
  cardio_machines: { label_pt: "Máquinas de Cardio", label_en: "Cardio Machines",   icon: "trending-up" },
}

export const DAY_META: Record<DayOfWeek, { label_pt: string; label_en: string }> = {
  MO: { label_pt: "Seg", label_en: "Mon" },
  TU: { label_pt: "Ter", label_en: "Tue" },
  WE: { label_pt: "Qua", label_en: "Wed" },
  TH: { label_pt: "Qui", label_en: "Thu" },
  FR: { label_pt: "Sex", label_en: "Fri" },
  SA: { label_pt: "Sáb", label_en: "Sat" },
  SU: { label_pt: "Dom", label_en: "Sun" },
}

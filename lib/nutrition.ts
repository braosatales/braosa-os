import type { IconName } from './icons'

export type NutritionProfile = {
  id: string
  user_id: string
  goal: 'lose_fat' | 'maintain' | 'build_muscle'
  target_calories: number
  target_protein_g: number
  target_carbs_g: number
  target_fat_g: number
  target_water_ml: number
  target_weight_kg: number
  target_date: string
  current_weight_kg: number
  height_cm: number
  age: number
  sex: string
  activity_level: string
  created_at: string
  updated_at: string
}

export type Food = {
  id: string
  user_id: string | null
  name: string
  name_pt: string | null
  brand: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  serving_size_g: number
  serving_label: string
  barcode: string | null
  verified: boolean
}

export type FoodLog = {
  id: string
  user_id: string
  date: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'
  food_id: string | null
  food_name: string
  amount_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  notes: string | null
  photo_url: string | null
  ai_identified: boolean
}

export type WeightLog = {
  id: string
  user_id: string
  date: string
  weight_kg: number
  notes: string | null
}

export type DayTotals = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export const MEAL_META: Record<FoodLog['meal'], { label_pt: string; label_en: string; glyph: IconName; color: string; order: number }> = {
  breakfast:    { label_pt: 'Pequeno-Almoço', label_en: 'Breakfast',    glyph: 'sun',     color: 'var(--c-fin)',    order: 1 },
  lunch:        { label_pt: 'Almoço',         label_en: 'Lunch',        glyph: 'clock',   color: 'var(--c-cal)',    order: 2 },
  dinner:       { label_pt: 'Jantar',         label_en: 'Dinner',       glyph: 'moon',    color: 'var(--c-mail)',   order: 3 },
  snack:        { label_pt: 'Lanche',         label_en: 'Snack',        glyph: 'spark',   color: 'var(--c-task)',   order: 4 },
  pre_workout:  { label_pt: 'Pré-Treino',     label_en: 'Pre-Workout',  glyph: 'bolt',    color: 'var(--c-health)', order: 5 },
  post_workout: { label_pt: 'Pós-Treino',     label_en: 'Post-Workout', glyph: 'flame',   color: 'var(--pos)',      order: 6 },
}

export function calculateMacrosForAmount(food: Food, amountG: number): DayTotals {
  const ratio = amountG / 100
  return {
    calories:  Math.round(food.calories_per_100g  * ratio * 10) / 10,
    protein_g: Math.round(food.protein_per_100g   * ratio * 10) / 10,
    carbs_g:   Math.round(food.carbs_per_100g     * ratio * 10) / 10,
    fat_g:     Math.round(food.fat_per_100g       * ratio * 10) / 10,
    fiber_g:   Math.round(food.fiber_per_100g     * ratio * 10) / 10,
  }
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

export function calculateTDEE(profile: NutritionProfile): number {
  const { current_weight_kg: w, height_cm: h, age, sex, activity_level } = profile
  const bmr = sex === 'female'
    ? 10 * w + 6.25 * h - 5 * age - 161
    : 10 * w + 6.25 * h - 5 * age + 5
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.55
  return Math.round(bmr * multiplier)
}

export function calculateWeightLossPace(profile: NutritionProfile): {
  weeklyLossKg: number
  weeksToGoal: number
  onTrack: boolean
} {
  const tdee = calculateTDEE(profile)
  const deficit = tdee - profile.target_calories
  const weeklyLossKg = Math.round((deficit * 7 / 7700) * 100) / 100

  const diff = Math.abs(profile.current_weight_kg - profile.target_weight_kg)
  const weeksToGoal = weeklyLossKg > 0
    ? Math.ceil(diff / weeklyLossKg)
    : 0

  const targetDate = new Date(profile.target_date)
  const today = new Date()
  const weeksAvailable = Math.max(0, (targetDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const onTrack = weeklyLossKg > 0 && weeksToGoal <= weeksAvailable

  return { weeklyLossKg, weeksToGoal, onTrack }
}

export type MealScanItem = {
  name: string
  name_pt: string
  estimated_amount_g: number
  amount_description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  confidence: number
  selected: boolean
}

export type MealScanResult = {
  meal_name: string
  confidence: number
  items: MealScanItem[]
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  total_fiber_g: number
  notes: string | null
  image_url: string | null
}

export function sumDayTotals(logs: FoodLog[]): DayTotals {
  return logs.reduce(
    (acc, l) => ({
      calories:  acc.calories  + l.calories,
      protein_g: acc.protein_g + l.protein_g,
      carbs_g:   acc.carbs_g   + l.carbs_g,
      fat_g:     acc.fat_g     + l.fat_g,
      fiber_g:   acc.fiber_g   + l.fiber_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  )
}

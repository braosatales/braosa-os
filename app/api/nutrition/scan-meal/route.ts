import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import type { MealScanItem } from '@/lib/nutrition'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const formData = await request.formData()
  const image = formData.get('image') as File | null

  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(image.type)) {
    return NextResponse.json({ error: 'Invalid image type. Must be JPEG, PNG, or WebP' }, { status: 400 })
  }

  if (image.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image too large. Max 10MB' }, { status: 400 })
  }

  const arrayBuffer = await image.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString('base64')
  const contentType = image.type as 'image/jpeg' | 'image/png' | 'image/webp'

  const { data: profileRow } = await supabase
    .from('nutrition_profiles')
    .select('goal, target_calories, target_protein_g, target_carbs_g, target_fat_g')
    .eq('user_id', userRow.id)
    .single()

  const profileContext = profileRow
    ? `User nutrition goal: ${profileRow.goal}. Daily targets: ${profileRow.target_calories}kcal, ${profileRow.target_protein_g}g protein, ${profileRow.target_carbs_g}g carbs, ${profileRow.target_fat_g}g fat.`
    : ''

  let scanResult: Record<string, unknown>
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: contentType, data: base64Data },
            },
            {
              type: 'text',
              text: `${profileContext}\n\nIdentify all food items visible in this meal photo and estimate their nutritional content.\n\nReturn ONLY a JSON object with this exact structure:\n{\n  "meal_name": string (brief description of the meal),\n  "confidence": number (0-1, overall confidence in identification),\n  "items": [\n    {\n      "name": string (food name in English),\n      "name_pt": string (food name in Portuguese),\n      "estimated_amount_g": number,\n      "amount_description": string (e.g. "1 medium chicken breast", "2 slices bread"),\n      "calories": number,\n      "protein_g": number,\n      "carbs_g": number,\n      "fat_g": number,\n      "fiber_g": number,\n      "confidence": number (0-1 for this specific item)\n    }\n  ],\n  "total_calories": number,\n  "total_protein_g": number,\n  "total_carbs_g": number,\n  "total_fat_g": number,\n  "total_fiber_g": number,\n  "notes": string (any caveats about the estimation, e.g. "sauce not accounted for")\n}\n\nBe realistic with portion estimates. If you cannot identify something, include it as "Unknown item" with conservative estimates. If this is not a food photo, return { "error": "not_food" }`,
            },
          ],
        }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    const text = (data.content?.[0]?.text as string) ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    scanResult = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('Meal scan error:', err)
    return NextResponse.json({ error: 'ai_error' }, { status: 500 })
  }

  if (scanResult.error === 'not_food') {
    return NextResponse.json({ error: 'not_food' }, { status: 422 })
  }

  let imageUrl: string | null = null
  try {
    const ext = contentType.split('/')[1]
    const fileName = `${userRow.id}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(fileName, Buffer.from(arrayBuffer), { contentType, upsert: false })
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('meal-photos').getPublicUrl(fileName)
      imageUrl = urlData.publicUrl ?? null
    }
  } catch {
    // storage upload failure is non-fatal
  }

  const rawItems = (scanResult.items as unknown[]) ?? []
  const items: MealScanItem[] = rawItems.map((item: unknown) => {
    const i = item as Record<string, unknown>
    return {
      name:                 String(i.name ?? ''),
      name_pt:              String(i.name_pt ?? ''),
      estimated_amount_g:   Number(i.estimated_amount_g ?? 0),
      amount_description:   String(i.amount_description ?? ''),
      calories:             Number(i.calories ?? 0),
      protein_g:            Number(i.protein_g ?? 0),
      carbs_g:              Number(i.carbs_g ?? 0),
      fat_g:                Number(i.fat_g ?? 0),
      fiber_g:              Number(i.fiber_g ?? 0),
      confidence:           Number(i.confidence ?? 0),
      selected:             true,
    }
  })

  return NextResponse.json({
    items,
    totals: {
      calories:  Number(scanResult.total_calories  ?? 0),
      protein_g: Number(scanResult.total_protein_g ?? 0),
      carbs_g:   Number(scanResult.total_carbs_g   ?? 0),
      fat_g:     Number(scanResult.total_fat_g     ?? 0),
      fiber_g:   Number(scanResult.total_fiber_g   ?? 0),
    },
    mealName:   String(scanResult.meal_name ?? ''),
    confidence: Number(scanResult.confidence ?? 0),
    notes:      scanResult.notes ? String(scanResult.notes) : null,
    imageUrl,
  })
}

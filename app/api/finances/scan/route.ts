import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const contentType = file.type
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or PDF.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)

  if (imageBuffer.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
  }

  // Upload to Supabase Storage (non-fatal if it fails)
  let imageUrl: string | null = null
  try {
    const storagePath = `${userRow.id}/${Date.now()}.${contentType === 'application/pdf' ? 'pdf' : 'jpg'}`
    const { data: storageData } = await supabase.storage
      .from('invoices')
      .upload(storagePath, imageBuffer, { contentType })
    if (storageData) imageUrl = storageData.path
  } catch {
    // continue without storage
  }

  // Create pending record
  const { data: scanRecord, error: insertError } = await supabase
    .from('invoice_scans')
    .insert({ user_id: userRow.id, image_url: imageUrl, status: 'pending' })
    .select('id')
    .single()

  if (insertError || !scanRecord) {
    return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 })
  }

  const scanId = scanRecord.id as string

  if (!process.env.ANTHROPIC_API_KEY) {
    await supabase.from('invoice_scans').update({ status: 'failed' }).eq('id', scanId)
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const base64ImageData = imageBuffer.toString('base64')
  const mediaType = contentType as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

  let extractedData: Record<string, unknown>
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64ImageData,
                },
              },
              {
                type: 'text',
                text: `Extract invoice/receipt data from this image. Return ONLY a JSON object with these fields:
{
  "vendor": "string (shop/company name)",
  "date": "string (YYYY-MM-DD format, use today if unclear: ${new Date().toISOString().slice(0, 10)})",
  "total": "number (total amount in euros, negative number for expenses)",
  "currency": "string (default EUR)",
  "category": "string (best guess: Groceries|Dining|Transport|Shopping|Utilities|Health|Entertainment|Other)",
  "description": "string (brief description of purchase)",
  "line_items": [{"description": "string", "amount": "number"}],
  "vat_amount": "number or null",
  "invoice_number": "string or null",
  "confidence": "number (0-1, how confident you are in the extraction)"
}
If this is not an invoice or receipt, return {"error": "Not an invoice"}`,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const aiData = await res.json()
    const rawText = (aiData.content?.[0]?.text as string) ?? ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    extractedData = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('AI extraction error:', err)
    await supabase.from('invoice_scans').update({ status: 'failed' }).eq('id', scanId)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }

  if (extractedData.error) {
    await supabase.from('invoice_scans').update({ status: 'failed' }).eq('id', scanId)
    return NextResponse.json({ error: 'not_invoice' }, { status: 400 })
  }

  await supabase
    .from('invoice_scans')
    .update({ status: 'processed', extracted_data: extractedData })
    .eq('id', scanId)

  return NextResponse.json({ scanId, extractedData })
}

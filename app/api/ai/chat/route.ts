import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/ai-context'
import { NextRequest, NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function POST(request: NextRequest) {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { messages, conversationId: existingConvId } = body as {
    messages: { role: string; content: string }[]
    conversationId?: string
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      content: 'ANTHROPIC_API_KEY not configured in Vercel env vars.',
      conversationId: null,
    })
  }

  const [systemPrompt] = await Promise.all([buildSystemPrompt(userRow.id as string)])

  // Get or create conversation
  let conversationId = existingConvId ?? null

  if (!conversationId) {
    const firstContent = messages[0]?.content ?? ''
    const title = firstContent.slice(0, 50)
    const { data: conv } = await supabase
      .from('ai_conversations')
      .insert({ user_id: userRow.id, title, message_count: 0, updated_at: new Date().toISOString() })
      .select('id')
      .single()
    conversationId = (conv?.id as string) ?? null
  } else {
    const { data: conv } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userRow.id)
      .single()
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Call Anthropic API
  let responseText: string
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
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    responseText = (data.content?.[0]?.text as string) ?? ''
  } catch (err) {
    console.error('Anthropic API error:', err)
    return NextResponse.json({
      content: 'Erro ao contactar a IA. Tenta novamente. / Error contacting AI. Please try again.',
      conversationId,
    })
  }

  // Save messages + update conversation
  if (conversationId) {
    const lastUserMsg = messages[messages.length - 1]
    await supabase.from('ai_messages').insert([
      { conversation_id: conversationId, user_id: userRow.id, role: lastUserMsg.role, content: lastUserMsg.content },
      { conversation_id: conversationId, user_id: userRow.id, role: 'assistant', content: responseText },
    ])

    const { data: current } = await supabase
      .from('ai_conversations')
      .select('message_count')
      .eq('id', conversationId)
      .single()

    await supabase
      .from('ai_conversations')
      .update({
        updated_at: new Date().toISOString(),
        message_count: ((current?.message_count as number) ?? 0) + 2,
      })
      .eq('id', conversationId)
  }

  return NextResponse.json({ content: responseText, conversationId })
}

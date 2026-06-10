import { createServiceClient } from './supabase/service'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function fmtEur(n: number): string {
  const abs = Math.abs(Math.round(n))
  const formatted = abs.toLocaleString('pt-PT')
  return `${n < 0 ? '-' : ''}€${formatted}`
}

export async function buildSystemPrompt(userId: string): Promise<string> {
  const supabase = createServiceClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekStart = getWeekStart(today)

  const [
    userRes,
    profileRes,
    planRes,
    tasksRes,
    accountsRes,
    debtsRes,
    investRes,
    notesRes,
    habitsRes,
    sessionsRes,
  ] = await Promise.all([
    supabase.from('users').select('name, email').eq('id', userId).single(),
    supabase.from('workout_profiles').select('goal, experience_level, equipment').eq('user_id', userId).maybeSingle(),
    supabase.from('training_plans').select('week_start, planned_sessions(status, session_name)').eq('user_id', userId).order('week_start', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('tasks').select('id, title, fav, due').eq('user_id', userId).not('status', 'in', '("done","cancelled")'),
    supabase.from('finance_accounts').select('balance').eq('user_id', userId),
    supabase.from('finance_debts').select('balance').eq('user_id', userId),
    supabase.from('finance_investments').select('current_value').eq('user_id', userId),
    supabase.from('notes').select('title').eq('user_id', userId).eq('archived', false).order('updated_at', { ascending: false }).limit(5),
    supabase.from('habits').select('name, streak').eq('user_id', userId).eq('archived', false),
    supabase.from('workout_sessions').select('name, started_at').eq('user_id', userId).order('started_at', { ascending: false }).limit(3),
  ])

  const user = userRes.data
  const profile = profileRes.data
  const plan = planRes.data
  const tasks = tasksRes.data ?? []
  const notes = notesRes.data ?? []
  const habits = habitsRes.data ?? []
  const sessions = sessionsRes.data ?? []

  const totalCash = (accountsRes.data ?? []).reduce((s, a) => s + ((a.balance as number) ?? 0), 0)
  const totalDebt = (debtsRes.data ?? []).reduce((s, d) => s + ((d.balance as number) ?? 0), 0)
  const totalInvest = (investRes.data ?? []).reduce((s, i) => s + ((i.current_value as number) ?? 0), 0)
  const netWorth = totalCash + totalInvest - totalDebt

  const pendingCount = tasks.length
  const overdueCount = tasks.filter(t => t.due && (t.due as string) < todayStr).length
  const favTasks = tasks.filter(t => t.fav).slice(0, 3).map(t => t.title as string)
  const top3 = favTasks.length > 0 ? favTasks : tasks.slice(0, 3).map(t => t.title as string)

  const plannedSessions = (plan?.planned_sessions as { status: string }[] | null)?.length ?? 0
  const completedSessions = (plan?.planned_sessions as { status: string }[] | null)?.filter(s => s.status === 'completed').length ?? 0
  const isCurrentWeek = plan?.week_start === weekStart
  const lastSession = sessions[0]

  const dayOfWeek = today.toLocaleDateString('pt-PT', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
  const userName = (user?.name as string | null) ?? 'Utilizador'

  return `You are Braosa, a personal AI assistant living inside BraosaOS — ${userName}'s personal operating system. You have full context of their life across finances, tasks, health, and notes. Detect the language of each user message and respond in that language (default: Portuguese).

## About ${userName}
- Name: ${userName}
- Today: ${dateStr} (${dayOfWeek})

## Finances
- Net worth: ${fmtEur(netWorth)}
- Cash: ${fmtEur(totalCash)}
- Total debt: ${fmtEur(totalDebt)}

## Tasks
- ${pendingCount} pending tasks, ${overdueCount} overdue
- Priority tasks: ${top3.join(', ') || 'None'}

## Health & Training
- Goal: ${(profile?.goal as string | null) ?? 'Not set'}
- Experience: ${(profile?.experience_level as string | null) ?? 'Not set'}
- This week: ${isCurrentWeek ? `${completedSessions} of ${plannedSessions} sessions done` : 'No plan this week'}
- Active plan: ${plan ? `Week of ${plan.week_start as string}${isCurrentWeek ? ' (current)' : ''}` : 'No active plan'}
- Recent workout: ${lastSession ? `${lastSession.name as string} on ${new Date(lastSession.started_at as string).toLocaleDateString('pt-PT')}` : 'No recent workouts'}

## Habits
${habits.length > 0 ? habits.map(h => `- ${h.name as string}: ${(h.streak as number) ?? 0} day streak`).join('\n') : '- No habits tracked'}

## Recent Notes
${notes.length > 0 ? notes.map(n => `- ${(n.title as string | null) || 'Untitled'}`).join('\n') : '- No recent notes'}

## Your role
- Be concise and direct — this is a command center, not a chatbot
- Give actionable advice based on real data above
- When asked about finances, reference actual numbers
- When asked about workouts, reference their actual plan and profile
- When asked to create tasks, notes, or reminders, tell the user clearly what to do (you cannot write to the DB directly yet)
- Respond in the same language as the user's message (PT or EN)
- Never make up data — only reference what's in the context above
- Keep responses under 200 words unless the user asks for detail
- Personality: warm, sharp, like a brilliant friend who knows everything about your life`
}

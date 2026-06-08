import { NextRequest, NextResponse } from 'next/server'
import { verifyIClaudeKey, unauthorized } from '@/lib/iclaudeAuth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  if (!verifyIClaudeKey(request)) return unauthorized()

  const supabase = createServiceClient()
  const { data: userRow } = await supabase
    .from('users').select('id').limit(1).single()

  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const userId = userRow.id
  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: todayTasks },
    { data: overdueTasks },
    { data: upcomingTasks },
    { data: projects },
    { data: habits },
    { data: budgets },
    { data: debts },
    { data: investments },
    { data: recentNotes },
  ] = await Promise.all([
    supabase.from('tasks').select('id,external_id,title,priority,system,status,due_date,source')
      .eq('user_id', userId).eq('status', 'todo').eq('due_date', today),
    supabase.from('tasks').select('id,external_id,title,priority,system,status,due_date,source')
      .eq('user_id', userId).eq('status', 'todo').lt('due_date', today).not('due_date', 'is', null),
    supabase.from('tasks').select('id,external_id,title,priority,system,status,due_date,source')
      .eq('user_id', userId).eq('status', 'todo').gt('due_date', today).lte('due_date', in7Days),
    supabase.from('projects').select('id,name,world,status,next_action,deadline')
      .eq('user_id', userId).eq('archived', false),
    supabase.from('habits').select('id,name,color').eq('user_id', userId).eq('archived', false),
    supabase.from('finance_budgets').select('category,month_limit').eq('user_id', userId).eq('is_active', true),
    supabase.from('finance_debts').select('name,balance,interest_rate').eq('user_id', userId).eq('is_active', true),
    supabase.from('finance_investments').select('name,current_value,investment_type').eq('user_id', userId).eq('is_active', true),
    supabase.from('notes').select('id,title,content,tags,pinned,updated_at')
      .eq('user_id', userId).eq('archived', false)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false }).limit(20),
  ])

  const totalDebt = (debts ?? []).reduce((s, d) => s + Number(d.balance), 0)
  const totalInvest = (investments ?? []).reduce((s, i) => s + Number(i.current_value), 0)
  const totalBudget = (budgets ?? []).reduce((s, b) => s + Number(b.month_limit), 0)

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    active_projects: projects ?? [],
    tasks: {
      today: todayTasks ?? [],
      overdue: overdueTasks ?? [],
      upcoming_7_days: upcomingTasks ?? [],
    },
    finances: {
      total_debt: totalDebt,
      total_investments: totalInvest,
      total_budget_limit: totalBudget,
      month_budget_used_pct: null,
      alerts: [],
    },
    habits: habits ?? [],
    notes: recentNotes ?? [],
    family: { notes: null },
  })
}

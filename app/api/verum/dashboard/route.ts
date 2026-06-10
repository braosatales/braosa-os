import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

async function resolveUser() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { user: null, userRow: null, supabase: null }
  const supabase = createServiceClient()
  const { data: userRow } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single()
  return { user, userRow: userRow ?? null, supabase }
}

export async function GET() {
  const { userRow, supabase } = await resolveUser()
  if (!userRow || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const yearStart = new Date(); yearStart.setMonth(0); yearStart.setDate(1)
  const yearStartStr = yearStart.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  const in14Days = new Date(); in14Days.setDate(in14Days.getDate() + 14)
  const in14DaysStr = in14Days.toISOString().split('T')[0]

  const [projectsRes, milestonesRes, financialsRes, teamRes, recentRes] = await Promise.all([
    supabase.from('verum_projects').select('id, status, budget').eq('user_id', userRow.id),
    supabase.from('verum_milestones')
      .select('*, project:verum_projects(name)')
      .eq('user_id', userRow.id)
      .eq('completed', false)
      .lte('due_date', in14DaysStr)
      .order('due_date', { ascending: true }),
    supabase.from('verum_financials')
      .select('type, amount, date')
      .eq('user_id', userRow.id)
      .gte('date', yearStartStr),
    supabase.from('verum_team').select('id').eq('user_id', userRow.id).eq('active', true),
    supabase.from('verum_financials')
      .select('*')
      .eq('user_id', userRow.id)
      .order('date', { ascending: false })
      .limit(5),
  ])

  const projects = projectsRes.data ?? []
  const financials = financialsRes.data ?? []

  const activeProjects = projects.filter(p => p.status === 'active').length
  const totalProjectValue = projects.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.budget ?? 0), 0)

  const totalRevenue = financials.filter(f => f.type === 'revenue' || f.type === 'invoice').reduce((sum, f) => sum + f.amount, 0)
  const totalExpenses = financials.filter(f => f.type === 'expense' || f.type === 'payroll').reduce((sum, f) => sum + f.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  // projects by status
  const statusCount: Record<string, number> = {}
  for (const p of projects) {
    statusCount[p.status] = (statusCount[p.status] ?? 0) + 1
  }
  const projectsByStatus = Object.entries(statusCount).map(([status, count]) => ({ status, count }))

  // monthly revenue last 6 months
  const monthMap: Record<string, { revenue: number; expenses: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    monthMap[key] = { revenue: 0, expenses: 0 }
  }

  // need all financials for 6 months for chart
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const { data: allFinancials } = await supabase
    .from('verum_financials')
    .select('type, amount, date')
    .eq('user_id', userRow.id)
    .gte('date', sixMonthsAgo.toISOString().split('T')[0])

  for (const f of allFinancials ?? []) {
    const key = f.date.slice(0, 7)
    if (!monthMap[key]) continue
    if (f.type === 'revenue' || f.type === 'invoice') monthMap[key].revenue += f.amount
    if (f.type === 'expense' || f.type === 'payroll') monthMap[key].expenses += f.amount
  }
  const monthlyRevenue = Object.entries(monthMap).map(([month, v]) => ({ month, ...v }))

  return NextResponse.json({
    activeProjects,
    totalProjectValue,
    totalRevenue,
    totalExpenses,
    netProfit,
    pendingMilestones: milestonesRes.data ?? [],
    teamCount: teamRes.data?.length ?? 0,
    recentFinancials: recentRes.data ?? [],
    projectsByStatus,
    monthlyRevenue,
  })
}

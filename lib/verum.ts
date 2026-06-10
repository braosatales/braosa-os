export type VerumProject = {
  id: string
  user_id: string
  name: string
  client: string | null
  description: string | null
  status: 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  type: 'construction' | 'real_estate' | 'renovation' | 'consulting' | 'other'
  budget: number | null
  spent: number | null
  start_date: string | null
  end_date: string | null
  address: string | null
  notes: string | null
  priority: number
  order_index: number
  milestones?: VerumMilestone[]
  created_at: string
  updated_at: string
}

export type VerumMilestone = {
  id: string
  user_id: string
  project_id: string
  title: string
  due_date: string | null
  completed: boolean
  completed_at: string | null
  notes: string | null
  order_index: number
  created_at: string
}

export type VerumTeamMember = {
  id: string
  user_id: string
  name: string
  role: string
  email: string | null
  phone: string | null
  department: string | null
  salary_monthly: number | null
  start_date: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type VerumFinancial = {
  id: string
  user_id: string
  date: string
  type: 'revenue' | 'expense' | 'invoice' | 'payroll'
  amount: number
  description: string
  project_id: string | null
  category: string | null
  notes: string | null
  created_at: string
}

export const PROJECT_STATUS_META: Record<VerumProject['status'], { label_pt: string; label_en: string; color: string }> = {
  lead:      { label_pt: 'Lead',         label_en: 'Lead',       color: 'var(--c-fin)' },
  active:    { label_pt: 'Ativo',        label_en: 'Active',     color: 'var(--pos)' },
  on_hold:   { label_pt: 'Em Espera',    label_en: 'On Hold',    color: 'var(--ink-dim)' },
  completed: { label_pt: 'Concluído',    label_en: 'Completed',  color: 'var(--c-braosa)' },
  cancelled: { label_pt: 'Cancelado',    label_en: 'Cancelled',  color: 'var(--neg)' },
}

export const PROJECT_TYPE_META: Record<VerumProject['type'], { label_pt: string; label_en: string; glyph: string }> = {
  construction: { label_pt: 'Construção',     label_en: 'Construction', glyph: 'building' },
  real_estate:  { label_pt: 'Imobiliário',    label_en: 'Real Estate',  glyph: 'home' },
  renovation:   { label_pt: 'Remodelação',    label_en: 'Renovation',   glyph: 'wand' },
  consulting:   { label_pt: 'Consultoria',    label_en: 'Consulting',   glyph: 'users' },
  other:        { label_pt: 'Outro',          label_en: 'Other',        glyph: 'dots' },
}

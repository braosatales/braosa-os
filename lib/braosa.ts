export type BraosaMetric = {
  id: string
  user_id: string
  date: string
  metric: string
  value: number
  label: string | null
  source: 'manual' | 'api'
  created_at: string
}

export type BraosaProduct = {
  id: string
  user_id: string
  name: string
  description: string | null
  category: 'tool' | 'supplement' | 'companion' | 'core'
  status: 'planned' | 'in_progress' | 'beta' | 'live' | 'paused' | 'deprecated'
  url: string | null
  priority: number
  notes: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export type BraosaContent = {
  id: string
  user_id: string
  title: string
  body: string | null
  platform: 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'newsletter' | 'blog' | 'other'
  status: 'idea' | 'draft' | 'ready' | 'scheduled' | 'published'
  scheduled_for: string | null
  published_at: string | null
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export const PRODUCT_STATUS_META: Record<BraosaProduct['status'], { label_pt: string; label_en: string; color: string }> = {
  planned:     { label_pt: 'Planeado',       label_en: 'Planned',      color: 'var(--ink-faint)' },
  in_progress: { label_pt: 'Em Progresso',   label_en: 'In Progress',  color: 'var(--c-fin)' },
  beta:        { label_pt: 'Beta',           label_en: 'Beta',         color: 'var(--c-task)' },
  live:        { label_pt: 'Live',           label_en: 'Live',         color: 'var(--pos)' },
  paused:      { label_pt: 'Pausado',        label_en: 'Paused',       color: 'var(--ink-dim)' },
  deprecated:  { label_pt: 'Descontinuado',  label_en: 'Deprecated',   color: 'var(--neg)' },
}

export const PLATFORM_META: Record<BraosaContent['platform'], { label: string; color: string; glyph: string }> = {
  instagram:  { label: 'Instagram',   color: 'var(--c-verum)',  glyph: 'camera' },
  twitter:    { label: 'X / Twitter', color: 'var(--c-mail)',   glyph: 'send' },
  tiktok:     { label: 'TikTok',      color: 'var(--c-health)', glyph: 'activity' },
  youtube:    { label: 'YouTube',     color: 'var(--neg)',      glyph: 'trending-up' },
  newsletter: { label: 'Newsletter',  color: 'var(--c-fin)',    glyph: 'mail' },
  blog:       { label: 'Blog',        color: 'var(--c-task)',   glyph: 'file' },
  other:      { label: 'Other',       color: 'var(--ink-dim)',  glyph: 'dots' },
}

export const KPI_META: Record<string, { label_pt: string; label_en: string; glyph: string; color: string; format: 'number' | 'currency' | 'text' }> = {
  total_users:           { label_pt: 'Utilizadores Totais',  label_en: 'Total Users',      glyph: 'users',       color: 'var(--c-braosa)', format: 'number' },
  active_users_24h:      { label_pt: 'Ativos (24h)',         label_en: 'Active (24h)',      glyph: 'activity',    color: 'var(--pos)',      format: 'number' },
  names_generated_total: { label_pt: 'Nomes Gerados',        label_en: 'Names Generated',   glyph: 'wand',        color: 'var(--c-task)',   format: 'number' },
  names_generated_24h:   { label_pt: 'Nomes Hoje',           label_en: 'Names Today',       glyph: 'spark',       color: 'var(--c-task)',   format: 'number' },
  waitlist_count:        { label_pt: 'Lista de Espera',      label_en: 'Waitlist',          glyph: 'users',       color: 'var(--c-fin)',    format: 'number' },
  revenue_mrr:           { label_pt: 'MRR',                  label_en: 'MRR',               glyph: 'trending-up', color: 'var(--pos)',      format: 'currency' },
  revenue_total:         { label_pt: 'Receita Total',        label_en: 'Total Revenue',     glyph: 'coins',       color: 'var(--c-fin)',    format: 'currency' },
  top_category:          { label_pt: 'Categoria Top',        label_en: 'Top Category',      glyph: 'star',        color: 'var(--c-braosa)', format: 'text' },
}

export const ATELIER_TOOLS = [
  'The Signet', 'The Tome', 'The Cartographer', 'The Bestiary', 'The Codex', 'The Forge',
  'The Chronicle', 'The Oracle', 'The Weaver', 'The Archivist', 'The Herald', 'The Sculptor',
  'The Alchemist', 'The Navigator', 'The Keeper', 'The Bard', 'The Sentinel', 'The Merchant',
  'The Scholar', 'The Wanderer', 'The Artificer', 'The Dreamer',
]

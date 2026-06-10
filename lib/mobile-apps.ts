export type MobileSubTab = {
  id: string
  label_pt: string
  label_en: string
  glyph: string
}

export type MobileApp = {
  id: string
  label_pt: string
  label_en: string
  color: string
  glyph: string
  subTabs?: MobileSubTab[]
}

export const MOBILE_APPS: MobileApp[] = [
  {
    id: 'dashboard',
    label_pt: 'Início',
    label_en: 'Home',
    color: 'var(--c-dash)',
    glyph: 'grid',
  },
  {
    id: 'finances',
    label_pt: 'Finanças',
    label_en: 'Finances',
    color: 'var(--c-fin)',
    glyph: 'coins',
    subTabs: [
      { id: 'overview',  label_pt: 'Resumo',    label_en: 'Overview', glyph: 'chart-line'   },
      { id: 'accounts',  label_pt: 'Contas',    label_en: 'Accounts', glyph: 'bank'         },
      { id: 'debt',      label_pt: 'Dívidas',   label_en: 'Debt',     glyph: 'trending-down'},
      { id: 'invest',    label_pt: 'Invest',    label_en: 'Invest',   glyph: 'trending-up'  },
      { id: 'budget',    label_pt: 'Orçamento', label_en: 'Budget',   glyph: 'chart-bar'    },
    ],
  },
  {
    id: 'tasks',
    label_pt: 'Tarefas',
    label_en: 'Tasks',
    color: 'var(--c-task)',
    glyph: 'check',
    subTabs: [
      { id: 'today', label_pt: 'Hoje',   label_en: 'Today', glyph: 'target' },
      { id: 'board', label_pt: 'Quadro', label_en: 'Board', glyph: 'board'  },
      { id: 'list',  label_pt: 'Lista',  label_en: 'List',  glyph: 'list'   },
    ],
  },
  {
    id: 'notes',
    label_pt: 'Notas',
    label_en: 'Notes',
    color: 'var(--c-task)',
    glyph: 'note',
  },
  {
    id: 'health',
    label_pt: 'Saúde',
    label_en: 'Health',
    color: 'var(--c-health)',
    glyph: 'activity',
    subTabs: [
      { id: 'overview',  label_pt: 'Resumo',    label_en: 'Overview',  glyph: 'activity'   },
      { id: 'journey',   label_pt: 'Jornada',   label_en: 'Journey',   glyph: 'target'     },
      { id: 'workout',   label_pt: 'Treinar',   label_en: 'Workout',   glyph: 'flame'      },
      { id: 'routines',  label_pt: 'Rotinas',   label_en: 'Routines',  glyph: 'list'       },
      { id: 'history',   label_pt: 'Histórico', label_en: 'History',   glyph: 'chart-line' },
    ],
  },
  {
    id: 'nutrition',
    label_pt: 'Nutrição',
    label_en: 'Nutrition',
    color: 'var(--c-cal)',
    glyph: 'activity',
    subTabs: [
      { id: 'diary',    label_pt: 'Diário',    label_en: 'Diary',    glyph: 'calendar'    },
      { id: 'log',      label_pt: 'Registar',  label_en: 'Log',      glyph: 'plus'        },
      { id: 'progress', label_pt: 'Progresso', label_en: 'Progress', glyph: 'trending-up' },
      { id: 'foods',    label_pt: 'Alimentos', label_en: 'Foods',    glyph: 'search'      },
    ],
  },
  {
    id: 'ai',
    label_pt: 'Braosa AI',
    label_en: 'Braosa AI',
    color: 'var(--c-task)',
    glyph: 'wand',
  },
  {
    id: 'mail',
    label_pt: 'Mail',
    label_en: 'Mail',
    color: 'var(--c-mail)',
    glyph: 'mail',
    subTabs: [
      { id: 'smart',  label_pt: 'Smart',     label_en: 'Smart',   glyph: 'wand'  },
      { id: 'inbox',  label_pt: 'Entrada',   label_en: 'Inbox',   glyph: 'inbox' },
      { id: 'sent',   label_pt: 'Enviados',  label_en: 'Sent',    glyph: 'send'  },
      { id: 'drafts', label_pt: 'Rascunhos', label_en: 'Drafts',  glyph: 'edit'  },
    ],
  },
  {
    id: 'calendar',
    label_pt: 'Calendário',
    label_en: 'Calendar',
    color: 'var(--c-cal)',
    glyph: 'cal',
    subTabs: [
      { id: 'day',   label_pt: 'Dia',    label_en: 'Day',   glyph: 'clock'    },
      { id: 'week',  label_pt: 'Semana', label_en: 'Week',  glyph: 'calendar' },
      { id: 'month', label_pt: 'Mês',    label_en: 'Month', glyph: 'grid'     },
    ],
  },
  {
    id: 'contacts',
    label_pt: 'Contactos',
    label_en: 'Contacts',
    color: 'var(--c-task)',
    glyph: 'users',
  },
  {
    id: 'drive',
    label_pt: 'Drive',
    label_en: 'Drive',
    color: 'var(--c-fin)',
    glyph: 'file',
    subTabs: [
      { id: 'rrr',             label_pt: 'RRR',    label_en: 'RRR',    glyph: 'file' },
      { id: 'braosa-universe', label_pt: 'Braosa', label_en: 'Braosa', glyph: 'wand' },
    ],
  },
  {
    id: 'braosa',
    label_pt: 'Braosa',
    label_en: 'Braosa',
    color: 'var(--c-braosa)',
    glyph: 'wand',
    subTabs: [
      { id: 'dashboard', label_pt: 'Dashboard', label_en: 'Dashboard', glyph: 'grid' },
      { id: 'products',  label_pt: 'Produtos',  label_en: 'Products',  glyph: 'wand' },
      { id: 'content',   label_pt: 'Conteúdo',  label_en: 'Content',   glyph: 'edit' },
    ],
  },
  {
    id: 'verum',
    label_pt: 'Verum',
    label_en: 'Verum',
    color: 'var(--c-verum)',
    glyph: 'shield',
    subTabs: [
      { id: 'dashboard',  label_pt: 'Dashboard',  label_en: 'Dashboard',  glyph: 'grid'     },
      { id: 'projects',   label_pt: 'Projetos',   label_en: 'Projects',   glyph: 'building' },
      { id: 'team',       label_pt: 'Equipa',     label_en: 'Team',       glyph: 'users'    },
      { id: 'financials', label_pt: 'Financeiro', label_en: 'Financials', glyph: 'coins'    },
    ],
  },
]

export const APP_VERSION = '1.1.3'

export const SYSTEMS = [
  { id: "dashboard",  label: "Dashboard",  labelPt: "Painel",     color: "var(--c-dash)",      dim: "var(--c-dash-dim)",      glyph: "grid"      },
  { id: "finances",   label: "Finances",   labelPt: "Finanças",   color: "var(--c-fin)",       dim: "var(--c-fin-dim)",       glyph: "coins"     },
  { id: "tasks",      label: "Tasks",      labelPt: "Tarefas",    color: "var(--c-task)",      dim: "var(--c-task-dim)",      glyph: "check"     },
  { id: "notes",      label: "Notes",      labelPt: "Notas",      color: "var(--c-notes)",     dim: "var(--c-notes-dim)",     glyph: "note"      },
  { id: "health",     label: "Health",     labelPt: "Saúde",      color: "var(--c-health)",    dim: "var(--c-health-dim)",    glyph: "activity"  },
  { id: "nutrition",  label: "Nutrition",  labelPt: "Nutrição",   color: "var(--c-nutrition)", dim: "var(--c-nutrition-dim)", glyph: "nutrition" },
  { id: "mail",       label: "Mail",       labelPt: "Email",      color: "var(--c-mail)",      dim: "var(--c-mail-dim)",      glyph: "mail"      },
  { id: "calendar",   label: "Calendar",   labelPt: "Calendário", color: "var(--c-cal)",       dim: "var(--c-cal-dim)",       glyph: "cal"       },
  { id: "contacts",   label: "Contacts",   labelPt: "Contactos",  color: "var(--c-contacts)",  dim: "var(--c-contacts-dim)",  glyph: "users"     },
  { id: "drive",      label: "Drive",      labelPt: "Drive",      color: "var(--c-drive)",     dim: "var(--c-drive-dim)",     glyph: "file"      },
  { id: "ai",         label: "AI",         labelPt: "IA",         color: "var(--c-ai)",        dim: "var(--c-ai-dim)",        glyph: "wand"      },
] as const

export const COMPANIES = [
  { id: "braosa", label: "Braosa", labelPt: "Braosa", color: "var(--c-braosa)", dim: "var(--c-braosa-dim)", glyph: "braosa" },
  { id: "verum",  label: "Verum",  labelPt: "Verum",  color: "var(--c-verum)",  dim: "var(--c-verum-dim)",  glyph: "verum"  },
] as const

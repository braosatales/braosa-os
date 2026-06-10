export const SYSTEMS = [
  { id: "dashboard", label: "Dashboard",  labelPt: "Painel",     icon: "grid",    color: "var(--c-dash)",   dim: "var(--c-dash-dim)"   },
  { id: "finances",  label: "Finance",    labelPt: "Finanças",   icon: "coins",   color: "var(--c-fin)",    dim: "var(--c-fin-dim)"    },
  { id: "tasks",     label: "Tasks",      labelPt: "Tarefas",    icon: "check",   color: "var(--c-task)",   dim: "var(--c-task-dim)"   },
  { id: "email",     label: "Mail",       labelPt: "Email",      icon: "mail",    color: "var(--c-mail)",   dim: "var(--c-mail-dim)"   },
  { id: "calendar",  label: "Calendar",   labelPt: "Calendário", icon: "cal",     color: "var(--c-cal)",    dim: "var(--c-cal-dim)"    },
  { id: "contacts",  label: "Contacts",   labelPt: "Contactos",  icon: "users",   color: "var(--c-task)",   dim: "var(--c-task-dim)"   },
  { id: "drive",     label: "Drive",      labelPt: "Drive",      icon: "file",    color: "var(--c-fin)",    dim: "var(--c-fin-dim)"    },
  { id: "health",    label: "Health",     labelPt: "Saúde",      icon: "pulse",   color: "var(--c-health)", dim: "var(--c-health-dim)" },
  { id: "notes",     label: "Notes",      labelPt: "Notas",      icon: "note",    color: "var(--c-dash)",   dim: "var(--c-dash-dim)"   },
] as const

export const COMPANIES = [
  { id: "braosa",  label: "Braosa",  icon: "building", color: "var(--c-braosa)", dim: "var(--c-braosa-dim)" },
  { id: "verum",   label: "Verum",   icon: "shield",   color: "var(--c-verum)",  dim: "var(--c-verum-dim)"  },
] as const

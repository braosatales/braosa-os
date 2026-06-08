export const SYSTEMS = [
  { id: "dashboard", label: "Dashboard", color: "var(--c-dash)", dim: "var(--c-dash-dim)", glyph: "grid" },
  { id: "finances",  label: "Finances",  color: "var(--c-fin)",  dim: "var(--c-fin-dim)",  glyph: "coins" },
  { id: "tasks",     label: "Tasks",     color: "var(--c-task)", dim: "var(--c-task-dim)", glyph: "check" },
  { id: "email",     label: "Email",     color: "var(--c-mail)", dim: "var(--c-mail-dim)", glyph: "mail" },
  { id: "calendar",  label: "Calendar",  color: "var(--c-cal)",  dim: "var(--c-cal-dim)",  glyph: "cal" },
  { id: "health",    label: "Health",    color: "var(--c-health)", dim: "var(--c-health-dim)", glyph: "pulse" },
  { id: "notes",     label: "Notes",     color: "var(--c-dash)",   dim: "var(--c-dash-dim)",   glyph: "edit" },
] as const;

export const COMPANIES = [
  { id: "braosa", label: "Braosa", color: "var(--c-braosa)", dim: "var(--c-braosa-dim)", glyph: "building" },
  { id: "verum",  label: "Verum",  color: "var(--c-verum)",  dim: "var(--c-verum-dim)",  glyph: "shield" },
] as const;

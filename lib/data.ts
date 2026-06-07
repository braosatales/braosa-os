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

export const USER = {
  name: "João",
  lifeScore: 7420,
  level: 14,
  streak: 23,
  xpToNext: 0.62,
};

export const PLACEHOLDER_TASKS = [
  { id: 1, title: "Pagar IUC do carro", p: 1, fav: true,  due: "Today",    tag: "Finances" },
  { id: 2, title: "Entregar declaração de IRS", p: 2, fav: true,  due: "19 Jun", tag: "Finances" },
  { id: 3, title: "Responder ao senhorio sobre o contrato", p: 1, fav: false, due: "Yesterday", tag: "Email" },
  { id: 4, title: "Rebalancear ETF / PPR", p: 2, fav: false, due: "Sat", tag: "Finances" },
  { id: 5, title: "Confirmar reunião com contabilista", p: 2, fav: false, due: "Mon", tag: "Finances" },
];

export const PLACEHOLDER_FINANCES = {
  net: -16719,
  assets: 141681,
  debt: 158400,
  accounts: [
    { id: "chk",  name: "Conta Corrente",     bank: "Banco A", balance: 8420,  synced: "4m ago",  trend: [12,14,13,16,15,18,17,19,18,21], up: true },
    { id: "sav",  name: "Fundo de Emergência", bank: "Banco A", balance: 24800, synced: "4m ago",  trend: [20,20,21,21,22,23,23,24,24,25], up: true },
    { id: "hys",  name: "Poupança",            bank: "Banco B", balance: 41250, synced: "22m ago", trend: [33,34,36,37,38,39,40,40,41,41], up: true },
  ],
  debts: [
    { id: "card1", name: "Cartão Visa",        kind: "Crédito", balance: 4280,   rate: 22.9, min: 128, payoff: "Mar 2027" },
    { id: "auto",  name: "Crédito Auto",       kind: "Veículo", balance: 12400,  rate: 6.1,  min: 320, payoff: "Ago 2029" },
    { id: "home",  name: "Crédito Habitação",  kind: "Imóvel",  balance: 141720, rate: 3.2,  min: 890, payoff: "Jan 2052" },
  ],
};

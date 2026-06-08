import { getLang } from "./i18n"

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)
  const lang = getLang()

  if (diffSec < 60) return lang === "pt" ? "agora" : "just now"
  if (diffMin < 60) return lang === "pt" ? `há ${diffMin}m` : `${diffMin}m ago`
  if (diffHr < 24) return lang === "pt" ? `há ${diffHr}h` : `${diffHr}h ago`
  if (diffDays === 1) return lang === "pt" ? "ontem" : "yesterday"
  if (diffDays < 7) return lang === "pt" ? `há ${diffDays} dias` : `${diffDays} days ago`

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function dueLabel(
  due: string | null | undefined,
): { text: string; over: boolean; now: boolean } | null {
  if (!due) return null

  const lang = getLang()
  const dueDate = new Date(due)
  const today = new Date()

  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayDay = new Date(todayDay.getTime() - 86_400_000)
  const tomorrowDay = new Date(todayDay.getTime() + 86_400_000)

  const isToday = dueDay.getTime() === todayDay.getTime()
  const isTomorrow = dueDay.getTime() === tomorrowDay.getTime()
  const isYesterday = dueDay.getTime() === yesterdayDay.getTime()
  const isOver = dueDay.getTime() < todayDay.getTime()

  let text: string
  if (isToday) {
    text = lang === "pt" ? "Hoje" : "Today"
  } else if (isTomorrow) {
    text = lang === "pt" ? "Amanhã" : "Tomorrow"
  } else if (isYesterday) {
    text = lang === "pt" ? "Ontem" : "Yesterday"
  } else {
    text = dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  return { text, over: isOver, now: isToday }
}

export function formatDate(date: string | Date, format: "short" | "long" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date
  const lang = getLang()

  if (format === "short") {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  if (lang === "pt") {
    const raw = d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })
    // "12 de janeiro de 2026" → "12 de Janeiro de 2026"
    return raw.replace(/de (\p{L})/u, (_, c: string) => `de ${c.toUpperCase()}`)
  }

  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

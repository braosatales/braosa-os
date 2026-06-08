import { getLang } from "./i18n"

function locale(): string {
  return getLang() === "en" ? "en-IE" : "pt-PT"
}

export const fmt = {
  eur: (n: number): string =>
    new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n),

  eurc: (n: number): string =>
    new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n),

  eurk: (n: number): string => {
    if (Math.abs(n) < 1000) return fmt.eur(n)
    const lang = getLang()
    const k = n / 1000
    const isWhole = k % 1 === 0
    const raw = isWhole ? String(Math.round(k)) : k.toFixed(1)
    const kStr = lang === "pt" ? raw.replace(".", ",") : raw
    return lang === "pt" ? `${kStr}k €` : `€${kStr}k`
  },

  pct: (n: number): string => {
    const sign = n > 0 ? "+" : ""
    return `${sign}${new Intl.NumberFormat(locale(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(n)}%`
  },

  num: (n: number): string =>
    new Intl.NumberFormat(locale(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n),

  dec: (n: number, dp = 2): string =>
    new Intl.NumberFormat(locale(), {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    }).format(n),
}

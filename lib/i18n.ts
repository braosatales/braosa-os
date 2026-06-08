"use client"

import { useState, useEffect } from "react"

export type Lang = "pt" | "en"

const STORAGE_KEY = "braosa-lang"
const EVENT_NAME = "braosa-lang-change"

export function getLang(): Lang {
  if (typeof window === "undefined") return "pt"
  return (localStorage.getItem(STORAGE_KEY) as Lang) ?? "pt"
}

export function setLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang)
  window.dispatchEvent(new CustomEvent<Lang>(EVENT_NAME, { detail: lang }))
}

export function L(pt: string, en: string): string {
  return getLang() === "en" ? en : pt
}

export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>("pt")

  useEffect(() => {
    setLangState(getLang())

    function handler(e: Event) {
      setLangState((e as CustomEvent<Lang>).detail)
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  return lang
}

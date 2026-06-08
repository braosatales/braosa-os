"use client"

import { useState, useEffect } from "react"

export type Tweaks = {
  displayFont: "Outfit" | "Plus Jakarta Sans" | "Space Grotesk"
  bodyFont: "DM Sans" | "Inter"
  accentIntensity: number
  roundness: number
}

export const TWEAK_DEFAULTS: Tweaks = {
  displayFont: "Outfit",
  bodyFont: "DM Sans",
  accentIntensity: 40,
  roundness: 14,
}

export const FONT_STACKS: Record<string, string> = {
  "Outfit": '"Outfit", system-ui, sans-serif',
  "Plus Jakarta Sans": '"Plus Jakarta Sans", system-ui, sans-serif',
  "Space Grotesk": '"Space Grotesk", system-ui, sans-serif',
}

export const BODY_STACKS: Record<string, string> = {
  "DM Sans": '"DM Sans", system-ui, sans-serif',
  "Inter": '"Inter", system-ui, sans-serif',
}

const STORAGE_KEY = "braosa-tweaks"
const EVENT_NAME = "braosa-tweaks-change"

export function getTweaks(): Tweaks {
  if (typeof window === "undefined") return { ...TWEAK_DEFAULTS }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...TWEAK_DEFAULTS }
    return { ...TWEAK_DEFAULTS, ...JSON.parse(stored) }
  } catch {
    return { ...TWEAK_DEFAULTS }
  }
}

export function saveTweaks(tweaks: Tweaks): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks))
  const r = document.documentElement
  r.style.setProperty("--font-display", FONT_STACKS[tweaks.displayFont])
  r.style.setProperty("--font-body", BODY_STACKS[tweaks.bodyFont])
  r.style.setProperty("--glow", (tweaks.accentIntensity / 100).toFixed(2))
  r.style.setProperty("--radius", tweaks.roundness + "px")
  r.style.setProperty("--radius-sm", Math.max(4, tweaks.roundness - 5) + "px")
  r.style.setProperty("--radius-lg", (tweaks.roundness + 6) + "px")
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function useTweaks(): [Tweaks, (key: keyof Tweaks, value: any) => void] {
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS)

  useEffect(() => {
    setTweaks(getTweaks())

    function handler() {
      setTweaks(getTweaks())
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  function setTweak(key: keyof Tweaks, value: any) {
    const next = { ...getTweaks(), [key]: value }
    saveTweaks(next)
    setTweaks(next)
  }

  return [tweaks, setTweak]
}

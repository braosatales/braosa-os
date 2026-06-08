"use client"

import { useState, useEffect } from "react"

export type FinanceSummary = {
  netWorth: number
  totalAssets: number
  totalCash: number
  totalInvest: number
  totalDebt: number
  budgets: { cat: string; spent: number; limit: number }[]
  updatedAt: string
}

export async function getFinanceSummary(): Promise<FinanceSummary | null> {
  try {
    const res = await fetch("/api/dashboard/finance-summary")
    if (!res.ok) return null
    return (await res.json()) as FinanceSummary
  } catch {
    return null
  }
}

export function useFinanceSummary(): { data: FinanceSummary | null; loading: boolean } {
  const [data, setData] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const result = await getFinanceSummary()
      if (!cancelled) {
        setData(result)
        setLoading(false)
      }
    }

    load()

    const timer = setInterval(load, 300_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return { data, loading }
}

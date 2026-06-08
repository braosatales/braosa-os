'use client'

import { useState, useEffect } from 'react'
import type { Account, Debt, Investment, Budget } from './finance'

export type Transaction = {
  id: string; account_id: string; user_id: string; date: string
  description: string; amount: number; category: string | null; notes: string | null
}

export type FinanceData = {
  accounts: Account[]; debts: Debt[]; investments: Investment[]
  budgets: Budget[]; recentTransactions: Transaction[]
  totals: { totalCash: number; totalInvest: number; totalDebt: number; totalAssets: number; netWorth: number }
}

let _data: FinanceData | null = null
let _loading = false
const _listeners = new Set<() => void>()

export const FinanceStore = {
  get: () => _data,
  isLoading: () => _loading,
  subscribe(fn: () => void) { _listeners.add(fn); return () => _listeners.delete(fn) },
  notify() { _listeners.forEach(fn => fn()) },
  invalidate() { _data = null; FinanceStore.fetch() },
  async fetch() {
    if (_loading) return
    _loading = true; FinanceStore.notify()
    try {
      const r = await fetch('/api/finances/overview')
      if (r.ok) _data = await r.json()
    } finally { _loading = false; FinanceStore.notify() }
  },
  async addAccount(data: Partial<Account>) { await fetch('/api/finances/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async updateAccount(id: string, data: Partial<Account>) { await fetch(`/api/finances/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async deleteAccount(id: string) { await fetch(`/api/finances/accounts/${id}`, { method: 'DELETE' }); FinanceStore.invalidate() },
  async addDebt(data: Partial<Debt>) { await fetch('/api/finances/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async updateDebt(id: string, data: Partial<Debt>) { await fetch(`/api/finances/debts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async deleteDebt(id: string) { await fetch(`/api/finances/debts/${id}`, { method: 'DELETE' }); FinanceStore.invalidate() },
  async addInvestment(data: Partial<Investment>) { await fetch('/api/finances/investments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async updateInvestment(id: string, data: Partial<Investment>) { await fetch(`/api/finances/investments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async deleteInvestment(id: string) { await fetch(`/api/finances/investments/${id}`, { method: 'DELETE' }); FinanceStore.invalidate() },
  async addBudget(data: Partial<Budget>) { await fetch('/api/finances/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async updateBudget(id: string, data: Partial<Budget>) { await fetch(`/api/finances/budgets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); FinanceStore.invalidate() },
  async deleteBudget(id: string) { await fetch(`/api/finances/budgets/${id}`, { method: 'DELETE' }); FinanceStore.invalidate() },
}

export function useFinanceStore(): { data: FinanceData | null; loading: boolean } {
  const [, rerender] = useState(0)
  useEffect(() => {
    const unsub = FinanceStore.subscribe(() => rerender(n => n + 1))
    if (!_data && !_loading) FinanceStore.fetch()
    return () => { unsub() }
  }, [])
  return { data: FinanceStore.get(), loading: FinanceStore.isLoading() }
}

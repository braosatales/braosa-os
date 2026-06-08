export type Account = {
  id: string; user_id: string; name: string; bank: string; balance: number
  type: "checking" | "savings" | "investment" | "other"
  synced_at: string | null; trend: number[]; created_at: string
}

export type Debt = {
  id: string; user_id: string; name: string; kind: string
  balance: number; rate: number; min_payment: number
  payoff_date: string | null; created_at: string
}

export type Investment = {
  id: string; user_id: string; name: string; institution: string
  current_value: number; day_change_pct: number | null
  allocation: string | null; created_at: string
}

export type Budget = {
  id: string; user_id: string; category: string
  spent: number; limit_amount: number
  period: "monthly" | "weekly" | "yearly"; created_at: string
}

export type FinanceTab = "overview" | "accounts" | "debt" | "invest" | "budget" | "babysteps"

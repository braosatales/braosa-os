'use client'

import { useState, useEffect } from 'react'
import Sparkline from '@/components/os/Sparkline'

type Summary = {
  net_worth: number
  total_assets: number
  total_debt: number
}

function fmt(n: number): string {
  const abs = Math.abs(n)
  const str = abs >= 1000
    ? abs.toLocaleString('pt-PT', { maximumFractionDigits: 0 })
    : abs.toFixed(0)
  return (n < 0 ? '−' : '') + '€' + str
}

export function NetWorthWidget() {
  const [data, setData] = useState<Summary | null>(null)
  useEffect(() => {
    fetch('/api/finances/summary').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) return <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Loading…</div>
  const positive = data.net_worth >= 0

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 700, lineHeight: 1,
        color: positive ? 'var(--c-fin)' : 'var(--neg)',
      }}>
        {fmt(data.net_worth)}
      </div>
      <div style={{ marginTop: 8 }}>
        <Sparkline data={[0, 0, 0, 0, 0, 0, data.net_worth > 0 ? 1 : -1]} color={positive ? 'var(--c-fin)' : 'var(--neg)'} height={36} width={120} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Assets {fmt(data.total_assets)}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Debt {fmt(data.total_debt)}</span>
      </div>
    </div>
  )
}

export function AssetsWidget() {
  const [data, setData] = useState<Summary | null>(null)
  useEffect(() => {
    fetch('/api/finances/summary').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) return <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Loading…</div>

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--c-fin)' }}>
        {fmt(data.total_assets)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>Cash + investments</div>
    </div>
  )
}

export function DebtWidget() {
  const [data, setData] = useState<Summary | null>(null)
  useEffect(() => {
    fetch('/api/finances/summary').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) return <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Loading…</div>

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--c-health)' }}>
        {fmt(data.total_debt)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>Active loans</div>
    </div>
  )
}

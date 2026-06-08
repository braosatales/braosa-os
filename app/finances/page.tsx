'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/os/Icon'

const SUBNAV = [
  { id: 'overview',    label: 'Overview',    glyph: 'chart' },
  { id: 'accounts',   label: 'Accounts',    glyph: 'bank' },
  { id: 'debt',       label: 'Debt',        glyph: 'umbrella' },
  { id: 'babysteps',  label: 'Baby Steps',  glyph: 'rocket' },
  { id: 'calculators',label: 'Calculators', glyph: 'target' },
  { id: 'ai',         label: 'Braosa AI',   glyph: 'spark' },
]

type Account = { id: string; name: string; balance: number; [k: string]: unknown }
type Debt = { id: string; name: string; balance: number; interest_rate: number; [k: string]: unknown }

type Summary = {
  net_worth: number
  total_assets: number
  total_debt: number
  accounts: Account[]
  debts: Debt[]
}

function fmt(n: number): string {
  const abs = Math.abs(n)
  const str = abs.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return (n < 0 ? '−' : '') + '€' + str
}

export default function FinancesPage() {
  const [active, setActive] = useState('overview')

  return (
    <div style={{ paddingTop: 62, height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <aside className="fin-sidebar" style={{
        width: 188, flexShrink: 0, height: '100%',
        background: 'var(--bg-base)', borderRight: '1px solid var(--edge-soft)',
        padding: '18px 8px', display: 'flex', flexDirection: 'column', gap: 2,
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 8px 10px' }}>
          Finances
        </div>
        {SUBNAV.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="subnav-item"
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', border: 'none',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              textAlign: 'left', transition: 'all .12s ease',
              color: active === item.id ? 'var(--c-fin)' : 'var(--ink-dim)',
              background: active === item.id ? 'var(--c-fin-dim)' : 'transparent',
              borderLeft: active === item.id ? '2px solid var(--c-fin)' : '2px solid transparent',
            } as React.CSSProperties}
          >
            <Icon name={item.glyph} size={14} />
            {item.label}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {active === 'overview'    && <OverviewSection />}
        {active === 'accounts'    && <AccountsSection />}
        {active === 'debt'        && <DebtSection />}
        {active === 'babysteps'   && <BabyStepsSection />}
        {active === 'calculators' && <CalculatorsSection />}
        {active === 'ai'          && <AiSection />}
      </main>

      <aside className="fin-rail" style={{
        width: 336, flexShrink: 0, height: '100%',
        background: 'var(--bg-base)', borderLeft: '1px solid var(--edge-soft)',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="spark" size={15} style={{ color: 'var(--c-braosa)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Braosa AI</span>
        </div>
        <div style={{
          background: 'var(--bg-raised)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--edge)', padding: '12px 14px',
          fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6,
        }}>
          Ask me about your financial picture and I&apos;ll help you make sense of it.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <input
            placeholder="Ask about your finances…"
            style={{
              flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--edge)',
              borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: 12,
              padding: '8px 12px',
            }}
          />
          <button className="btn btn-accent" style={{ padding: '8px 10px', '--accent': 'var(--c-braosa)' } as React.CSSProperties}>
            <Icon name="send" size={13} />
          </button>
        </div>
      </aside>
    </div>
  )
}

function useSummary() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/finances/summary')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  return { data, loading }
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 180, background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

function OverviewSection() {
  const { data, loading } = useSummary()
  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>
  if (!data) return null

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Overview</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Net Worth"    value={fmt(data.net_worth)}    color={data.net_worth >= 0 ? 'var(--c-fin)' : 'var(--neg)'} />
        <StatCard label="Total Assets" value={fmt(data.total_assets)} color="var(--c-fin)" />
        <StatCard label="Total Debt"   value={fmt(data.total_debt)}   color="var(--c-health)" sub={`${data.debts.length} active loans`} />
      </div>
    </div>
  )
}

function AccountsSection() {
  const { data, loading } = useSummary()
  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>
  if (!data) return null

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Accounts</h2>
      {data.accounts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
          <Icon name="bank" size={40} stroke={1.2} style={{ marginBottom: 14, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No accounts connected yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.accounts.map(acct => (
            <div key={acct.id} className="acct-row" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--edge)', background: 'var(--bg-raised)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--c-fin-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="bank" size={16} style={{ color: 'var(--c-fin)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{acct.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  {fmt(acct.balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DebtSection() {
  const { data, loading } = useSummary()
  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>
  if (!data) return null

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Debt</h2>
      {data.debts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)', paddingTop: 60 }}>
          <Icon name="umbrella" size={40} stroke={1.2} style={{ marginBottom: 14, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No active debts</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.debts.map(d => (
            <div key={d.id} className="debt-row" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--edge)', background: 'var(--bg-raised)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Rate</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--neg)' }}>{d.interest_rate}%</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 100 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--c-health)' }}>
                  {fmt(d.balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BABY_STEPS = [
  { n: 1, label: '€1,000 Emergency Fund' },
  { n: 2, label: 'Debt Snowball' },
  { n: 3, label: '3–6 Month Emergency Fund' },
  { n: 4, label: 'Invest 15% for Retirement' },
  { n: 5, label: 'College Fund for Kids' },
  { n: 6, label: 'Pay Off Home' },
  { n: 7, label: 'Build Wealth & Give' },
]

function BabyStepsSection() {
  const { data, loading } = useSummary()
  const totalDebt = data?.total_debt ?? 0

  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>

  const activeStep = totalDebt > 1000 ? 2 : totalDebt > 0 ? 3 : 4

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Baby Steps</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BABY_STEPS.map(s => {
          const status = s.n < activeStep ? 'done' : s.n === activeStep ? 'active' : 'pending'
          return (
            <div key={s.n} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--edge)',
              background: status === 'active' ? 'var(--c-fin-dim)' : 'var(--bg-raised)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: status === 'done' ? 'var(--c-fin)' : status === 'active' ? 'var(--c-fin-dim)' : 'var(--bg-raised-2)',
                border: `2px solid ${status === 'done' ? 'var(--c-fin)' : status === 'active' ? 'var(--c-fin)' : 'var(--edge)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                color: status === 'done' ? 'oklch(0.17 0.01 80)' : status === 'active' ? 'var(--c-fin)' : 'var(--ink-faint)',
              }}>{s.n}</div>
              <div style={{ flex: 1, fontSize: 14, color: status === 'pending' ? 'var(--ink-dim)' : 'var(--ink)' }}>
                {s.label}
                {s.n === 2 && status === 'active' && data && (
                  <span style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 2 }}>
                    Remaining: {fmt(totalDebt)}
                  </span>
                )}
              </div>
              {status === 'done' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: 'var(--pos)', color: 'oklch(0.17 0.01 80)' }}>✓</span>
              )}
              {status === 'active' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: 'var(--c-fin)', color: 'oklch(0.17 0.01 80)' }}>IN PROGRESS</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalculatorsSection() {
  const [extra, setExtra] = useState(200)
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Calculators</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Debt Snowball</h3>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 10 }}>Extra monthly payment</div>
          <input
            type="range" min={0} max={1000} value={extra}
            onChange={e => setExtra(Number(e.target.value))}
            className="brange"
            style={{ '--accent': 'var(--c-fin)', '--pct': `${(extra / 1000) * 100}%` } as React.CSSProperties}
          />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'var(--c-fin)', marginTop: 14 }}>€{extra}/mo</div>
        </div>
        <div style={{ flex: 1, minWidth: 260, background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Compound Growth</h3>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Enter your initial amount, monthly contribution, expected rate, and years to see projected growth.
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 12 }}>Advanced calculator — coming soon</div>
        </div>
      </div>
    </div>
  )
}

function AiSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Braosa AI</h2>
      <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--edge)', padding: '16px 20px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
        Ask me about your financial picture and I&apos;ll help you make sense of it.
      </div>
    </div>
  )
}

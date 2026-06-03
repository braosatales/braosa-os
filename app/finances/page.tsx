'use client'

import { useState } from 'react'
import Icon from '@/components/os/Icon'
import Sparkline from '@/components/os/Sparkline'
import { PLACEHOLDER_FINANCES } from '@/lib/data'

const SUBNAV = [
  { id: 'overview',     label: 'Overview',     glyph: 'chart' },
  { id: 'budget',       label: 'Budget',       glyph: 'coins' },
  { id: 'accounts',     label: 'Accounts',     glyph: 'bank' },
  { id: 'debt',         label: 'Debt',         glyph: 'umbrella' },
  { id: 'investments',  label: 'Investments',  glyph: 'arrow' },
  { id: 'babysteps',    label: 'Baby Steps',   glyph: 'rocket' },
  { id: 'calculators',  label: 'Calculators',  glyph: 'target' },
  { id: 'ai',           label: 'Braosa AI',    glyph: 'spark' },
]

export default function FinancesPage() {
  const [active, setActive] = useState('overview')

  return (
    <div style={{ paddingTop: 62, height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Left sidebar */}
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

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {active === 'overview' && <OverviewSection />}
        {active === 'accounts' && <AccountsSection />}
        {active === 'debt' && <DebtSection />}
        {active === 'babysteps' && <BabyStepsSection />}
        {active === 'calculators' && <CalculatorsSection />}
        {(active === 'budget' || active === 'investments') && (
          <Placeholder label={active} />
        )}
        {active === 'ai' && <AiSection />}
      </main>

      {/* Right AI rail */}
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
          Good morning, João. Your net worth improved +1.2% this week.<br />
          Dining is €190 over budget — want me to flag it?
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

function StatCard({ label, value, color, sub, sparkData }: { label: string; value: string; color: string; sub?: string; sparkData?: number[] }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg-raised)', border: '1px solid var(--edge)',
      borderRadius: 'var(--radius)', padding: 20,
    }}>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sparkData && <div style={{ marginTop: 10 }}><Sparkline data={sparkData} color={color} height={32} width={100} /></div>}
      {sub && <div style={{ fontSize: 12, color: 'var(--pos)', marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

function OverviewSection() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Overview</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Net Worth" value="€-16,719" color="var(--neg)" sub="+1.2% this week" sparkData={[60,61,59,63,64,62,66,67,65,69]} />
        <StatCard label="Total Assets" value="€141,681" color="var(--c-fin)" sub="+€2,140 MTD" />
        <StatCard label="Total Debt" value="€158,400" color="var(--c-health)" sub="−€420 MTD" />
      </div>
    </div>
  )
}

function AccountsSection() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Accounts</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {PLACEHOLDER_FINANCES.accounts.map(acct => (
          <div key={acct.id} className="acct-row" style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 14px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--edge)', background: 'var(--bg-raised)',
            transition: 'background .12s',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--c-fin-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="bank" size={16} style={{ color: 'var(--c-fin)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{acct.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{acct.bank}</div>
            </div>
            <Sparkline data={acct.trend} color={acct.up ? 'var(--pos)' : 'var(--neg)'} height={24} width={64} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                €{acct.balance.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{acct.synced}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DebtSection() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Debt</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {PLACEHOLDER_FINANCES.debts.map(d => (
          <div key={d.id} className="debt-row" style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--edge)', background: 'var(--bg-raised)',
            transition: 'background .12s',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</span>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 5,
                  background: 'var(--c-health-dim)', color: 'var(--c-health)',
                }}>{d.kind}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Rate</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--neg)' }}>{d.rate}%</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Min payment</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)' }}>€{d.min}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Payoff</div>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{d.payoff}</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 100 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--c-health)' }}>
                €{d.balance.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const BABY_STEPS = [
  { n: 1, label: '€1,000 Emergency Fund', status: 'done', badge: '✓' },
  { n: 2, label: 'Debt Snowball', status: 'active', badge: 'IN PROGRESS' },
  { n: 3, label: '3-6 Month Emergency Fund', status: 'pending', badge: '' },
  { n: 4, label: 'Invest 15% for Retirement', status: 'pending', badge: '' },
  { n: 5, label: 'College Fund for Kids', status: 'pending', badge: '' },
  { n: 6, label: 'Pay Off Home', status: 'pending', badge: '' },
  { n: 7, label: 'Build Wealth & Give', status: 'pending', badge: '' },
]

function BabyStepsSection() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Baby Steps</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BABY_STEPS.map(s => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--edge)',
            background: s.status === 'active' ? 'var(--c-fin-dim)' : 'var(--bg-raised)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: s.status === 'done' ? 'var(--c-fin)' : s.status === 'active' ? 'var(--c-fin-dim)' : 'var(--bg-raised-2)',
              border: `2px solid ${s.status === 'done' ? 'var(--c-fin)' : s.status === 'active' ? 'var(--c-fin)' : 'var(--edge)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              color: s.status === 'done' ? 'oklch(0.17 0.01 80)' : s.status === 'active' ? 'var(--c-fin)' : 'var(--ink-faint)',
            }}>
              {s.n}
            </div>
            <div style={{ flex: 1, fontSize: 14, color: s.status === 'pending' ? 'var(--ink-dim)' : 'var(--ink)' }}>
              {s.label}
              {s.n === 2 && <span style={{ fontSize: 12, color: 'var(--ink-dim)', display: 'block', marginTop: 2 }}>Remaining: €16,680</span>}
            </div>
            {s.badge && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5,
                background: s.status === 'done' ? 'var(--pos)' : 'var(--c-fin)',
                color: s.status === 'done' ? 'oklch(0.17 0.01 80)' : 'oklch(0.17 0.01 80)',
              }}>{s.badge}</span>
            )}
          </div>
        ))}
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
        {/* Debt snowball */}
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
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 12 }}>Pay off in <strong>31 months</strong></div>
          <div style={{ fontSize: 13, color: 'var(--pos)', marginTop: 4 }}>Save €4,200 in interest</div>
        </div>

        {/* Investment return */}
        <div style={{ flex: 1, minWidth: 260, background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)', padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Investment Return</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Initial', value: '€41,250' },
              { label: 'Monthly', value: '€500' },
              { label: 'Rate', value: '7%' },
              { label: 'Years', value: '30' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-dim)' }}>{f.label}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{f.value}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--edge)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>Final value</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--c-fin)' }}>€187,420</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AiSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Braosa AI</h2>
      <div style={{
        background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--edge)',
        padding: '16px 20px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6,
      }}>
        Good morning, João. Your net worth improved +1.2% this week.<br />
        Dining is €190 over budget — want me to flag it?
      </div>
    </div>
  )
}

function Placeholder({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--ink-faint)' }}>
      <Icon name="chart" size={40} stroke={1.2} style={{ marginBottom: 14, opacity: 0.4 }} />
      <div style={{ fontSize: 14, textTransform: 'capitalize' }}>{label} — coming soon</div>
    </div>
  )
}

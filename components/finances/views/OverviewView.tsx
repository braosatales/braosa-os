'use client'
import { useLang, L } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { relativeTime } from '@/lib/date'
import { useFinanceStore } from '@/lib/finance-store'
import { Icon, Ring, Sparkline, EmptyState } from '@/components/ui'
import type { IconName } from '@/lib/icons'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

function categoryIcon(cat: string | null): IconName {
  if (!cat) return 'bank'
  const c = cat.toLowerCase()
  if (c.includes('food') || c.includes('comida') || c.includes('restaurante')) return 'flame'
  if (c.includes('income') || c.includes('rendimento') || c.includes('salary') || c.includes('salário')) return 'trending-up'
  if (c.includes('transport') || c.includes('transporte') || c.includes('fuel') || c.includes('gasolina')) return 'bolt'
  return 'bank'
}

function SkeletonCard() {
  return (
    <div style={{
      height: 88, background: 'var(--bg-raised-2)', borderRadius: 'var(--radius)',
      animation: 'skeleton-pulse 1.2s ease-in-out infinite alternate',
    }} />
  )
}

function SkeletonTxRow() {
  return (
    <div style={{
      height: 44, background: 'var(--bg-raised-2)', borderRadius: 8, marginBottom: 4,
      animation: 'skeleton-pulse 1.2s ease-in-out infinite alternate',
    }} />
  )
}

export default function OverviewView() {
  useLang()
  const isMobile = useIsMobile()
  const { data, loading } = useFinanceStore()

  if (loading && !data) {
    return (
      <div className="ov-split">
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 24 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonTxRow /><SkeletonTxRow /><SkeletonTxRow />
        </div>
        <div />
      </div>
    )
  }

  const totals = data?.totals ?? { totalCash: 0, totalInvest: 0, totalDebt: 0, totalAssets: 0, netWorth: 0 }
  const accounts = data?.accounts ?? []
  const budgets = data?.budgets ?? []
  const transactions = (data?.recentTransactions ?? []).slice(0, 10)

  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0)
  const totalLimit = budgets.reduce((s, b) => s + (b.limit_amount ?? 0), 0)
  const budgetRatio = totalLimit > 0 ? Math.min(totalSpent / totalLimit, 1) : 0
  const budgetPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
  const budgetColor = totalSpent <= totalLimit ? 'var(--pos)' : 'var(--neg)'

  return (
    <div className="ov-split">
      {/* Left column */}
      <div>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 24 }}>
          {[
            { label: L('Patrimônio', 'Net Worth'), value: fmt.eurk(totals.netWorth), color: 'var(--ink)' },
            { label: L('Ativos', 'Assets'), value: fmt.eurk(totals.totalAssets), color: 'var(--pos)' },
            { label: L('Dívidas', 'Debt'), value: fmt.eurk(totals.totalDebt), color: 'var(--neg)' },
            { label: L('Cash', 'Cash'), value: fmt.eurk(totals.totalCash), color: 'var(--ink-soft)' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius)', padding: '16px 18px',
              }}
            >
              <div style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em',
                color: 'var(--ink-faint)', marginBottom: 6, textTransform: 'uppercase',
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
                letterSpacing: '-0.02em', color,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {L('Transações Recentes', 'Recent Transactions')}
            </span>
            <span
              style={{ fontSize: 12, color: 'var(--ink-faint)', cursor: 'pointer' }}
            >
              {L('Ver todas →', 'View all →')}
            </span>
          </div>

          {transactions.length === 0 ? (
            <EmptyState icon="bank" title={L('Sem transações recentes', 'No recent transactions')} />
          ) : (
            transactions.map(tx => (
              <div
                key={tx.id}
                className="acct-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 6px', borderRadius: 8, cursor: 'default',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9, background: 'var(--bg-raised-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: 'var(--ink-dim)', display: 'flex' }}>
                    <Icon name={categoryIcon(tx.category)} size={14} />
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: 'var(--ink-soft)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tx.description}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                    {relativeTime(tx.date)}
                  </div>
                </div>
                <div
                  className="tnum"
                  style={{
                    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                    color: tx.amount >= 0 ? 'var(--pos)' : 'var(--neg)',
                  }}
                >
                  {tx.amount >= 0 ? '+' : ''}{fmt.eurc(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right rail */}
      <div className="fin-rail">
        {/* Accounts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--ink)', marginBottom: 2 }}>
            {L('Contas', 'Accounts')}
          </div>
          {accounts.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{L('Sem contas', 'No accounts')}</div>
          ) : accounts.map(acct => (
            <div
              key={acct.id}
              className="acct-row"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'var(--bg-raised)',
                border: '1px solid var(--edge)', borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acct.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{acct.bank}</div>
                {acct.synced_at && (
                  <div style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    synced {relativeTime(acct.synced_at)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {fmt.eur(acct.balance)}
                </div>
                {acct.trend?.length ? (
                  <Sparkline data={acct.trend} w={80} h={28} color="var(--c-fin)" />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Budget ring */}
        <div style={{
          marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <Ring
            value={budgetRatio}
            size={72}
            stroke={7}
            color={budgetColor}
            track="var(--edge-soft)"
          >
            <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: budgetColor }}>
              {budgetPct}%
            </span>
          </Ring>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center' }}>
            {L('do orçamento mensal usado', 'of monthly budget used')}
          </div>
        </div>
      </div>
    </div>
  )
}

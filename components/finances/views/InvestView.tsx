'use client'
import { useState } from 'react'
import { useLang, L } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { useFinanceStore, FinanceStore } from '@/lib/finance-store'
import { Icon, EmptyState } from '@/components/ui'
import type { Investment } from '@/lib/finance'
import AddInvestmentModal from '../modals/AddInvestmentModal'
import EditInvestmentModal from '../modals/EditInvestmentModal'

export default function InvestView() {
  useLang()
  const { data } = useFinanceStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editInvestment, setEditInvestment] = useState<Investment | null>(null)

  const investments = data?.investments ?? []
  const totals = data?.totals ?? { totalCash: 0, totalInvest: 0, totalDebt: 0, totalAssets: 0, netWorth: 0 }

  const growthIn10 = totals.totalInvest * Math.pow(1.07, 10)

  async function handleDelete(id: string) {
    if (!confirm(L('Apagar este investimento? Esta ação não pode ser desfeita.', 'Delete this investment? This cannot be undone.'))) return
    await FinanceStore.deleteInvestment(id)
  }

  return (
    <div className="ov-split">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
            {L('Investimentos', 'Investments')}
          </span>
          <span
            className="tnum"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--pos)',
              background: 'color-mix(in oklch, var(--pos) 14%, transparent)',
              border: '1px solid color-mix(in oklch, var(--pos) 30%, transparent)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
            }}
          >
            {fmt.eurk(totals.totalInvest)}
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} />
            {L('+ Adicionar', '+ Add')}
          </button>
        </div>

        {investments.length === 0 ? (
          <EmptyState
            icon="trending-up"
            title={L('Sem investimentos', 'No investments')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {investments.map(inv => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius)',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {inv.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{inv.institution}</div>
                  </div>
                  <span
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--pos)',
                    }}
                  >
                    {fmt.eur(inv.current_value)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, alignItems: 'center' }}>
                  {inv.day_change_pct !== null && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      color: inv.day_change_pct >= 0 ? 'var(--pos)' : 'var(--neg)',
                    }}>
                      <Icon name={inv.day_change_pct >= 0 ? 'trending-up' : 'trending-down'} size={11} />
                      <span className="tnum">{fmt.pct(inv.day_change_pct)}</span>
                    </span>
                  )}
                  {inv.allocation && (
                    <span style={{ color: 'var(--ink-faint)' }}>{inv.allocation}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn"
                    style={{ fontSize: 12 }}
                    onClick={() => setEditInvestment(inv)}
                  >
                    <Icon name="edit" size={13} />
                    {L('Editar', 'Edit')}
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: 12 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neg)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '' }}
                    onClick={() => handleDelete(inv.id)}
                  >
                    <Icon name="trash" size={13} />
                    {L('Apagar', 'Delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fin-rail">
        <div style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--radius)',
          padding: '16px 18px',
          marginBottom: 16,
        }}>
          <div
            className="tnum"
            style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--pos)' }}
          >
            {fmt.eurk(totals.totalInvest)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>
            {L('em investimentos', 'in investments')}
          </div>
        </div>

        {totals.totalInvest > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {investments.map(inv => {
              const pct = (inv.current_value / totals.totalInvest) * 100
              return (
                <div key={inv.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 12, color: 'var(--ink-soft)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {inv.name}
                    </span>
                    <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 8, flexShrink: 0 }}>
                      {fmt.pct(pct)}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-inset)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'var(--pos)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{
          background: 'var(--bg-inset)',
          border: '1px solid var(--edge-soft)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          display: 'flex',
          gap: 8,
        }}>
          <span style={{ color: 'var(--pos)', display: 'flex', flexShrink: 0, alignItems: 'flex-start', paddingTop: 1 }}>
            <Icon name="trending-up" size={13} />
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.6 }}>
            {L(
              `A 7% ao ano, ${fmt.eurk(totals.totalInvest)} torna-se ${fmt.eurk(growthIn10)} em 10 anos.`,
              `At 7%/year, ${fmt.eurk(totals.totalInvest)} becomes ${fmt.eurk(growthIn10)} in 10 years.`
            )}
          </span>
        </div>
      </div>

      <AddInvestmentModal open={showAdd} onClose={() => setShowAdd(false)} />
      <EditInvestmentModal investment={editInvestment} onClose={() => setEditInvestment(null)} />
    </div>
  )
}

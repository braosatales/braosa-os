'use client'
import { useState } from 'react'
import { useLang, L } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { formatDate } from '@/lib/date'
import { useFinanceStore, FinanceStore } from '@/lib/finance-store'
import { Icon, EmptyState } from '@/components/ui'
import type { Debt } from '@/lib/finance'
import AddDebtModal from '../modals/AddDebtModal'
import EditDebtModal from '../modals/EditDebtModal'

export default function DebtView() {
  useLang()
  const { data } = useFinanceStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)

  const debts = data?.debts ?? []
  const totals = data?.totals ?? { totalCash: 0, totalInvest: 0, totalDebt: 0, totalAssets: 0, netWorth: 0 }

  const byKind = debts.reduce<Record<string, number>>((acc, d) => {
    acc[d.kind] = (acc[d.kind] ?? 0) + d.balance
    return acc
  }, {})

  async function handleDelete(id: string) {
    if (!confirm(L('Apagar esta dívida? Esta ação não pode ser desfeita.', 'Delete this debt? This cannot be undone.'))) return
    await FinanceStore.deleteDebt(id)
  }

  return (
    <div className="ov-split">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
            {L('Dívidas', 'Debt')}
          </span>
          <span
            className="tnum"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--neg)',
              background: 'color-mix(in oklch, var(--neg) 14%, transparent)',
              border: '1px solid color-mix(in oklch, var(--neg) 30%, transparent)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
            }}
          >
            {fmt.eurk(totals.totalDebt)}
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} />
            {L('+ Adicionar Dívida', '+ Add Debt')}
          </button>
        </div>

        {debts.length === 0 ? (
          <EmptyState
            icon="trending-down"
            title={L('Sem dívidas', 'No debts')}
            subtitle={L('Adicione as suas dívidas para as acompanhar', 'Add your debts to track them')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {debts.map(debt => (
              <div
                key={debt.id}
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--edge)',
                  borderRadius: 'var(--radius)',
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    {debt.name}
                  </span>
                  <span style={{
                    display: 'inline-flex', fontSize: 11, padding: '2px 8px', borderRadius: 5,
                    background: 'color-mix(in oklch, var(--neg) 12%, transparent)',
                    color: 'var(--neg)',
                  }}>
                    {debt.kind}
                  </span>
                  <span
                    className="tnum"
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--neg)',
                    }}
                  >
                    {fmt.eur(debt.balance)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                  <span className="tnum" style={{ color: 'var(--ink-dim)' }}>APR {debt.rate}%</span>
                  <span style={{ color: 'var(--ink-faint)' }}>
                    {L('Mín. ', 'Min. ')}{fmt.eur(debt.min_payment)}{L('/mês', '/mo')}
                  </span>
                  {debt.payoff_date && (
                    <span style={{ color: 'var(--ink-faint)' }}>
                      {formatDate(debt.payoff_date, 'short')}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 10, height: 5, borderRadius: 99, background: 'var(--bg-inset)' }}>
                  <div style={{
                    width: '35%',
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--neg), var(--pos))',
                    borderRadius: 'inherit',
                  }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn"
                    style={{ fontSize: 12 }}
                    onClick={() => setEditDebt(debt)}
                  >
                    <Icon name="edit" size={13} />
                    {L('Editar', 'Edit')}
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: 12 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neg)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '' }}
                    onClick={() => handleDelete(debt.id)}
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
            style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--neg)' }}
          >
            {fmt.eur(debts.reduce((s, d) => s + d.min_payment, 0))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>
            {L('pagamento mínimo/mês', 'minimum payment/mo')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {Object.entries(byKind).map(([kind, total]) => (
            <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-soft)' }}>{kind}</span>
              <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{fmt.eurk(total)}</span>
              <div style={{ width: 60, height: 4, borderRadius: 99, background: 'var(--bg-inset)', flexShrink: 0 }}>
                <div style={{
                  width: `${totals.totalDebt > 0 ? (total / totals.totalDebt) * 100 : 0}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: 'var(--neg)',
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--bg-inset)',
          border: '1px solid var(--edge-soft)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          display: 'flex',
          gap: 8,
        }}>
          <span style={{ color: 'var(--ink-dim)', display: 'flex', flexShrink: 0, alignItems: 'flex-start', paddingTop: 1 }}>
            <Icon name="info" size={13} />
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            {L('Ordena pelo maior APR para liquidar mais rápido.', 'Sort by highest APR to pay off fastest.')}
          </span>
        </div>
      </div>

      <AddDebtModal open={showAdd} onClose={() => setShowAdd(false)} />
      <EditDebtModal debt={editDebt} onClose={() => setEditDebt(null)} />
    </div>
  )
}

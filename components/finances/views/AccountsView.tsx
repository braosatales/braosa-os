'use client'
import { useState, useEffect } from 'react'
import { useLang, L } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { relativeTime } from '@/lib/date'
import { useFinanceStore, FinanceStore, type Transaction } from '@/lib/finance-store'
import { Icon, Sparkline, Chip, EmptyState } from '@/components/ui'
import type { Account } from '@/lib/finance'
import AddAccountModal from '../modals/AddAccountModal'
import EditAccountModal from '../modals/EditAccountModal'
import AddTransactionModal from '../modals/AddTransactionModal'
import EditTransactionModal from '../modals/EditTransactionModal'

export default function AccountsView() {
  useLang()
  const { data } = useFinanceStore()

  const [showAddAccount, setShowAddAccount] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showAddTx, setShowAddTx] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const [txs, setTxs] = useState<Transaction[] | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txOffset, setTxOffset] = useState(0)

  const accounts = data?.accounts ?? []
  const totals = data?.totals ?? { totalCash: 0, totalInvest: 0, totalDebt: 0, totalAssets: 0, netWorth: 0 }

  const typeCounts: Record<string, number> = {}
  for (const acct of accounts) {
    typeCounts[acct.type] = (typeCounts[acct.type] ?? 0) + 1
  }

  const allTrends = accounts.filter(a => a.trend?.length).map(a => a.trend)
  let combinedTrend: number[] = []
  if (allTrends.length > 0) {
    const maxLen = Math.max(...allTrends.map(t => t.length))
    for (let i = 0; i < maxLen; i++) {
      const vals = allTrends.map(t => t[i] ?? t[t.length - 1]).filter((v): v is number => v !== undefined)
      combinedTrend.push(vals.reduce((a, b) => a + b, 0) / vals.length)
    }
  }

  async function loadTxs(accountId: string, offset = 0, append = false) {
    setTxLoading(true)
    try {
      const r = await fetch(`/api/finances/transactions?accountId=${accountId}&limit=50&offset=${offset}`)
      if (r.ok) {
        const json = await r.json()
        setTxs(prev => append ? [...(prev ?? []), ...json.transactions] : json.transactions)
      }
    } finally {
      setTxLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedAccountId) { setTxs(null); setTxOffset(0); return }
    setTxOffset(0)
    loadTxs(selectedAccountId, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId])

  function toggleAccount(id: string) {
    setSelectedAccountId(prev => prev === id ? null : id)
  }

  async function deleteAccount(id: string) {
    if (!confirm(L('Apagar esta conta? Esta ação não pode ser desfeita.', 'Delete this account? This cannot be undone.'))) return
    await FinanceStore.deleteAccount(id)
    if (selectedAccountId === id) setSelectedAccountId(null)
  }

  return (
    <div className="ov-split">
      {/* Left: Accounts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
            {L('Contas', 'Accounts')}
          </span>
          <button
            className="btn"
            style={{ '--accent': 'var(--c-fin)' } as React.CSSProperties}
            onClick={() => setShowAddAccount(true)}
          >
            <Icon name="plus" size={14} />
            {L('Adicionar', 'Add Account')}
          </button>
        </div>

        {accounts.length === 0 ? (
          <EmptyState icon="bank" title={L('Sem contas', 'No accounts')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {accounts.map(acct => {
              const isSelected = selectedAccountId === acct.id
              return (
                <div
                  key={acct.id}
                  style={{
                    border: '1px solid var(--edge)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-raised)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Card */}
                  <div className="acct-row" style={{ padding: '18px 20px', cursor: 'default' }}>
                    {/* Row 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>
                          {acct.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{acct.bank}</div>
                      </div>
                      <div
                        className="tnum"
                        style={{
                          fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)',
                          color: acct.balance >= 0 ? 'var(--pos)' : 'var(--neg)',
                        }}
                      >
                        {fmt.eur(acct.balance)}
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span style={{
                        display: 'inline-flex', fontSize: 11, padding: '2px 8px', borderRadius: 5,
                        background: 'var(--c-fin-dim)', color: 'var(--c-fin)',
                      }}>
                        {acct.type.charAt(0).toUpperCase() + acct.type.slice(1)}
                      </span>
                      {acct.synced_at && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-faint)' }}>
                          synced {relativeTime(acct.synced_at)}
                        </span>
                      )}
                      {acct.trend?.length ? (
                        <Sparkline data={acct.trend} w={120} h={32} color="var(--c-fin)" />
                      ) : null}
                    </div>

                    {/* Row 3 */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        className="btn"
                        style={{ fontSize: 12 }}
                        onClick={() => toggleAccount(acct.id)}
                      >
                        <Icon name="list" size={13} />
                        {L('Transações', 'Transactions')}
                      </button>
                      <button
                        className="btn"
                        style={{ fontSize: 12 }}
                        onClick={() => setEditAccount(acct)}
                      >
                        <Icon name="edit" size={13} />
                        {L('Editar', 'Edit')}
                      </button>
                      <button
                        className="btn"
                        style={{ fontSize: 12 }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--neg)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '' }}
                        onClick={() => deleteAccount(acct.id)}
                      >
                        <Icon name="trash" size={13} />
                        {L('Apagar', 'Delete')}
                      </button>
                    </div>
                  </div>

                  {/* Transactions panel */}
                  {isSelected && (
                    <div style={{ borderTop: '1px solid var(--edge-soft)', padding: '14px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
                          {L('Transações', 'Transactions')} — {acct.name}
                        </span>
                        <button className="btn" style={{ fontSize: 12 }} onClick={() => setShowAddTx(true)}>
                          <Icon name="plus" size={13} />
                          {L('Nova', 'New')}
                        </button>
                      </div>

                      {txLoading && !txs ? (
                        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                          {L('A carregar...', 'Loading...')}
                        </div>
                      ) : !txs || txs.length === 0 ? (
                        <EmptyState icon="bank" title={L('Sem transações', 'No transactions')} />
                      ) : (
                        <>
                          {txs.map(tx => (
                            <div
                              key={tx.id}
                              className="acct-row"
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 6px', borderRadius: 8, cursor: 'pointer' }}
                              onClick={() => setEditTx(tx)}
                            >
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', width: 80, flexShrink: 0 }}>
                                {tx.date.slice(0, 10)}
                              </span>
                              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tx.description}
                              </span>
                              {tx.category && <Chip label={tx.category} />}
                              <span
                                className="tnum"
                                style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: tx.amount >= 0 ? 'var(--pos)' : 'var(--neg)' }}
                              >
                                {tx.amount >= 0 ? '+' : ''}{fmt.eurc(tx.amount)}
                              </span>
                            </div>
                          ))}
                          {txs.length >= 50 && (
                            <button
                              className="btn"
                              style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 12 }}
                              onClick={() => {
                                const next = txOffset + 50
                                setTxOffset(next)
                                loadTxs(acct.id, next, true)
                              }}
                            >
                              {L('Carregar mais', 'Load more')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right rail */}
      <div className="fin-rail">
        <div style={{ marginBottom: 20 }}>
          <div
            className="tnum"
            style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--ink)' }}
          >
            {fmt.eurk(totals.totalCash)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>
            {L('em contas', 'in accounts')}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
          {Object.entries(typeCounts).map(([type, count]) => (
            <span key={type} style={{
              display: 'inline-flex', fontSize: 11, padding: '3px 10px', borderRadius: 99,
              background: 'var(--c-fin-dim)', color: 'var(--c-fin)', margin: 3,
            }}>
              {type} · {count}
            </span>
          ))}
        </div>

        {combinedTrend.length > 0 && (
          <Sparkline data={combinedTrend} w={280} h={48} color="var(--c-fin)" />
        )}
      </div>

      <AddAccountModal open={showAddAccount} onClose={() => setShowAddAccount(false)} />
      <EditAccountModal account={editAccount} onClose={() => setEditAccount(null)} />
      <AddTransactionModal
        open={showAddTx}
        accountId={selectedAccountId ?? ''}
        onClose={() => setShowAddTx(false)}
        onAdded={() => { if (selectedAccountId) loadTxs(selectedAccountId, 0) }}
      />
      <EditTransactionModal
        tx={editTx}
        onClose={() => setEditTx(null)}
        onDone={() => { if (selectedAccountId) loadTxs(selectedAccountId, 0) }}
      />
    </div>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
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
import ConnectBankModal from '../modals/ConnectBankModal'
import InvoiceScanner from '../InvoiceScanner'
import { Modal } from '@/components/ui'

type BankLink = {
  id: string
  gocardless_account_id: string
  finance_account_id: string | null
  account_name: string | null
  iban: string | null
  currency: string
}

type BankConnection = {
  id: string
  institution_id: string
  institution_name: string
  institution_logo: string | null
  requisition_id: string
  status: 'pending' | 'linked' | 'expired' | 'error'
  account_ids: string[]
  created_at: string
  last_synced_at: string | null
  bank_account_links: BankLink[]
}

function StatusDot({ status }: { status: BankConnection['status'] }) {
  const color =
    status === 'linked' ? 'var(--pos)' :
    status === 'pending' ? 'oklch(0.80 0.13 65)' :
    'var(--neg)'
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
  )
}

export default function AccountsView() {
  useLang()
  const { data } = useFinanceStore()

  const [showScanner, setShowScanner] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showConnectBank, setShowConnectBank] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showAddTx, setShowAddTx] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const [txs, setTxs] = useState<Transaction[] | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txOffset, setTxOffset] = useState(0)

  const [connections, setConnections] = useState<BankConnection[]>([])
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncAllLoading, setSyncAllLoading] = useState(false)
  const [syncToast, setSyncToast] = useState<string | null>(null)

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

  const loadConnections = useCallback(async () => {
    const r = await fetch('/api/bank/connections')
    if (r.ok) {
      const d = await r.json()
      setConnections(d.connections ?? [])
    }
  }, [])

  useEffect(() => { loadConnections() }, [loadConnections])

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

  async function syncConnection(connectionId: string) {
    setSyncingId(connectionId)
    try {
      const r = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      const d = await r.json()
      FinanceStore.invalidate()
      loadConnections()
      const msg = d.newTransactions > 0
        ? L(`${d.newTransactions} novas transações`, `${d.newTransactions} new transactions`)
        : L('Sincronizado', 'Synced')
      setSyncToast(msg)
      setTimeout(() => setSyncToast(null), 3000)
    } finally {
      setSyncingId(null)
    }
  }

  async function syncAll() {
    setSyncAllLoading(true)
    try {
      const r = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      FinanceStore.invalidate()
      loadConnections()
      const msg = d.newTransactions > 0
        ? L(`${d.newTransactions} novas transações`, `${d.newTransactions} new transactions`)
        : L('Tudo sincronizado', 'All synced')
      setSyncToast(msg)
      setTimeout(() => setSyncToast(null), 3000)
    } finally {
      setSyncAllLoading(false)
    }
  }

  async function removeConnection(connectionId: string) {
    if (!confirm(L('Remover ligação bancária?', 'Remove bank connection?'))) return
    await fetch(`/api/bank/connections/${connectionId}`, { method: 'DELETE' })
    loadConnections()
    FinanceStore.invalidate()
  }

  const linkedConnections = connections.filter(c => c.status === 'linked' || c.status === 'pending')

  return (
    <div className="ov-split">
      {/* Left: Accounts */}
      <div>
        {/* Toast */}
        {syncToast && (
          <div style={{
            marginBottom: 12, padding: '8px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--c-fin-dim)', border: '1px solid var(--c-fin)',
            fontSize: 12, color: 'var(--c-fin)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="check-circle" size={13} />
            {syncToast}
          </div>
        )}

        {/* Connected banks section */}
        {linkedConnections.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--ink-faint)' }}>
                {L('BANCOS LIGADOS', 'CONNECTED BANKS')}
              </span>
              <button
                className="btn"
                style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={syncAll}
                disabled={syncAllLoading}
              >
                <Icon name="refresh" size={12} />
                {syncAllLoading ? L('A sincronizar...', 'Syncing...') : L('Sincronizar Tudo', 'Sync All')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {linkedConnections.map(conn => (
                <div
                  key={conn.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                  }}
                >
                  {conn.institution_logo ? (
                    <img
                      src={conn.institution_logo}
                      alt={conn.institution_name}
                      width={28}
                      height={28}
                      style={{ borderRadius: 6, objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--c-fin)',
                    }}>
                      {conn.institution_name.charAt(0)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot status={conn.status} />
                      {conn.institution_name}
                    </div>
                    {conn.last_synced_at && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 1 }}>
                        {L('Sincronizado', 'Synced')} {relativeTime(conn.last_synced_at)}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => syncConnection(conn.id)}
                    disabled={syncingId === conn.id}
                  >
                    <Icon name="refresh" size={11} />
                    {syncingId === conn.id ? '...' : L('Sincronizar', 'Sync')}
                  </button>

                  <button
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: 'var(--ink-faint)', padding: '4px 8px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neg)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-faint)' }}
                    onClick={() => removeConnection(conn.id)}
                  >
                    {L('Remover', 'Remove')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
            {L('Contas', 'Accounts')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              onClick={() => setShowScanner(true)}
            >
              <Icon name="camera" size={14} />
              {L('Digitalizar Fatura', 'Scan Invoice')}
            </button>
            <button
              className="btn btn-accent"
              style={{ '--accent': 'var(--c-fin)' } as React.CSSProperties}
              onClick={() => setShowConnectBank(true)}
            >
              <Icon name="link" size={14} />
              {L('Ligar Banco', 'Connect Bank')}
            </button>
            <button
              className="btn"
              onClick={() => setShowAddAccount(true)}
            >
              <Icon name="plus" size={14} />
              {L('Adicionar Manual', 'Add Manual')}
            </button>
          </div>
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

      <Modal open={showScanner} onClose={() => setShowScanner(false)} width={520}>
        <InvoiceScanner onClose={() => setShowScanner(false)} />
      </Modal>
      <AddAccountModal open={showAddAccount} onClose={() => setShowAddAccount(false)} />
      <ConnectBankModal open={showConnectBank} onClose={() => setShowConnectBank(false)} />
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

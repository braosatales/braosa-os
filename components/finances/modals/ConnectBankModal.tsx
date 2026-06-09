'use client'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { useLang, L } from '@/lib/i18n'
import { Icon } from '@/components/ui'
import type { GCInstitution } from '@/lib/gocardless'

type Props = {
  open: boolean
  onClose: () => void
}

type Step = 'select' | 'connecting' | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-inset)',
  border: '1px solid var(--edge)',
  borderRadius: 'var(--radius-sm)',
  padding: '9px 13px',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
}

function BankInitial({ name }: { name: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: 'var(--bg-raised-2)', border: '1px solid var(--edge)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
      color: 'var(--c-fin)',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function ConnectBankModal({ open, onClose }: Props) {
  useLang()
  const [step, setStep] = useState<Step>('select')
  const [institutions, setInstitutions] = useState<GCInstitution[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GCInstitution | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('select')
    setSelected(null)
    setSearch('')
    setErrorMsg('')
    setFetching(true)
    fetch('/api/bank/institutions')
      .then(r => r.json())
      .then(d => setInstitutions(d.institutions ?? []))
      .catch(() => setInstitutions([]))
      .finally(() => setFetching(false))
  }, [open])

  const filtered = institutions.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleConnect() {
    if (!selected) return
    setLoading(true)
    setStep('connecting')
    try {
      const r = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: selected.id,
          institutionName: selected.name,
          institutionLogo: selected.logo,
        }),
      })
      const data = await r.json()
      if (!r.ok || !data.link) throw new Error(data.error ?? 'Connect failed')
      window.location.href = data.link
    } catch (err: any) {
      setErrorMsg(err.message)
      setStep('error')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={520}>
      {step === 'select' && (
        <div>
          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--edge-soft)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
              {L('Ligar Conta Bancária', 'Connect Bank Account')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
              {L(
                'Os teus dados são apenas de leitura. Nunca acedemos a pagamentos.',
                'Your data is read-only. We never access payments.'
              )}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {/* Search */}
            <input
              className="glow-focus"
              style={{ ...inputStyle, '--accent': 'var(--c-fin)' } as React.CSSProperties}
              placeholder={L('Pesquisar banco...', 'Search bank...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {/* Bank list */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {fetching ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                  {L('A carregar...', 'Loading...')}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                  {L('Nenhum banco encontrado', 'No banks found')}
                </div>
              ) : (
                filtered.map(inst => {
                  const isSelected = selected?.id === inst.id
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setSelected(inst)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 12, borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', textAlign: 'left',
                        background: isSelected ? 'var(--c-fin-dim)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--c-fin)' : 'transparent'}`,
                        transition: 'background .15s, border-color .15s',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-raised-2)'
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {inst.logo ? (
                        <img
                          src={inst.logo}
                          alt={inst.name}
                          width={36}
                          height={36}
                          style={{ borderRadius: 8, flexShrink: 0, objectFit: 'contain' }}
                          onError={e => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <BankInitial name={inst.name} />
                      )}
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)' }}>
                        {inst.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)' }}>
                        PT
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Connect button */}
            {selected && (
              <button
                className="btn btn-accent"
                style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center', marginTop: 16 } as React.CSSProperties}
                onClick={handleConnect}
                disabled={loading}
              >
                <Icon name="link" size={14} />
                {L(`Ligar ao ${selected.name}`, `Connect to ${selected.name}`)}
              </button>
            )}

            {/* Security footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: selected ? 12 : 20,
            }}>
              <span style={{ color: 'var(--ink-faint)', display: 'flex' }}><Icon name="lock" size={12} /></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                {L(
                  'Ligação segura via GoCardless · PSD2 · Apenas leitura',
                  'Secure connection via GoCardless · PSD2 · Read-only'
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'connecting' && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--c-fin)',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
            {L('A redirecionar para o teu banco...', 'Redirecting to your bank...')}
          </div>
        </div>
      )}

      {step === 'error' && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <span style={{ color: 'var(--neg)', display: 'flex', justifyContent: 'center' }}>
            <Icon name="x-circle" size={40} />
          </span>
          <div style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-dim)' }}>
            {errorMsg || L('Ocorreu um erro', 'An error occurred')}
          </div>
          <button
            className="btn"
            style={{ marginTop: 20 }}
            onClick={() => { setStep('select'); setErrorMsg('') }}
          >
            {L('Tentar novamente', 'Try again')}
          </button>
        </div>
      )}
    </Modal>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Icon, Modal } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import CreateFilterModal from './CreateFilterModal'

type GmailFilter = {
  id: string
  criteria: {
    from?: string
    to?: string
    subject?: string
    query?: string
    negatedQuery?: string
    hasAttachment?: boolean
  }
  action: {
    addLabelIds?: string[]
    removeLabelIds?: string[]
  }
}

type Props = {
  open: boolean
  onClose: () => void
}

function filterSummary(f: GmailFilter, lang: string): string {
  const parts: string[] = []
  if (f.criteria.from) parts.push(`From: ${f.criteria.from}`)
  if (f.criteria.to) parts.push(`To: ${f.criteria.to}`)
  if (f.criteria.subject) parts.push(`Subject: ${f.criteria.subject}`)
  if (f.criteria.query) parts.push(`Has: ${f.criteria.query}`)
  return parts.join(' · ') || (lang === 'pt' ? '(sem critérios)' : '(no criteria)')
}

function actionSummary(f: GmailFilter, lang: string): string {
  const parts: string[] = []
  if (f.action.removeLabelIds?.includes('UNREAD')) parts.push(lang === 'pt' ? 'Marcar lido' : 'Mark read')
  if (f.action.addLabelIds?.includes('STARRED')) parts.push(lang === 'pt' ? 'Favorito' : 'Star')
  if (f.action.addLabelIds?.includes('TRASH')) parts.push(lang === 'pt' ? 'Lixo' : 'Trash')
  const labels = (f.action.addLabelIds ?? []).filter(id => !['STARRED', 'TRASH'].includes(id))
  if (labels.length > 0) parts.push(`${lang === 'pt' ? 'Etiqueta:' : 'Label:'} ${labels.join(', ')}`)
  return parts.join(' · ') || (lang === 'pt' ? '(sem ação)' : '(no action)')
}

export default function FiltersPanel({ open, onClose }: Props) {
  const lang = useLang()
  const [filters, setFilters] = useState<GmailFilter[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFilters = () => {
    setLoading(true)
    fetch('/api/mail/filters')
      .then(r => r.json())
      .then(d => setFilters(d.filters ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) loadFilters()
  }, [open])

  async function deleteFilter(id: string) {
    try {
      await fetch('/api/mail/filters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filterId: id }),
      })
      setFilters(prev => prev.filter(f => f.id !== id))
      setConfirmDelete(null)
    } catch { setError(L('Erro ao apagar filtro', 'Error deleting filter')) }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} width={520}>
        <div style={{ padding: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              {L('Filtros', 'Filters')}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-accent"
                onClick={() => setCreateOpen(true)}
                style={{ fontSize: 12, padding: '6px 12px', '--accent': 'var(--c-mail)' } as any}
              >
                <Icon name="plus" size={12} />
                {L('Novo Filtro', 'New Filter')}
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2 }}>
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
              {L('A carregar...', 'Loading...')}
            </div>
          ) : filters.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <span style={{ color: 'var(--ink-faint)' }}><Icon name="filter" size={28} /></span>
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-faint)' }}>
                {L('Sem filtros configurados', 'No filters configured')}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filters.map(f => (
                <div key={f.id} style={{ background: 'var(--bg-inset)', borderRadius: 10, border: '1px solid var(--edge-soft)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
                        {filterSummary(f, lang)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                        {L('→', '→')} {actionSummary(f, lang)}
                      </div>
                    </div>

                    {confirmDelete === f.id ? (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => deleteFilter(f.id)}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)', border: '1px solid color-mix(in oklab, var(--neg) 30%, transparent)', cursor: 'pointer' }}
                        >
                          {L('Confirmar', 'Confirm')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'transparent', color: 'var(--ink-faint)', border: '1px solid var(--edge)', cursor: 'pointer' }}
                        >
                          {L('Cancelar', 'Cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(f.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 2, flexShrink: 0, opacity: 0.7 }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 10 }}>{error}</p>}
        </div>
      </Modal>

      <CreateFilterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadFilters}
      />
    </>
  )
}

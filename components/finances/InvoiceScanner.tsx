'use client'
import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'
import { useLang, L } from '@/lib/i18n'
import { fmt } from '@/lib/fmt'
import { relativeTime } from '@/lib/date'
import { FinanceStore, useFinanceStore } from '@/lib/finance-store'
import { Icon } from '@/components/ui'
import type { ExtractedInvoice, InvoiceScan } from '@/lib/scanner'

type Step = 'capture' | 'processing' | 'review' | 'success' | 'error'

type ErrorKind = 'not_invoice' | 'api_error'

const CATEGORIES = ['Groceries', 'Dining', 'Transport', 'Shopping', 'Utilities', 'Health', 'Entertainment', 'Other']

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-inset)',
  border: '1px solid var(--edge)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 13px',
  fontSize: 14,
  color: 'var(--ink)',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--ink-faint)',
  display: 'block',
  marginBottom: 5,
}

export default function InvoiceScanner({ onClose }: { onClose?: () => void }) {
  useLang()
  const { data } = useFinanceStore()
  const accounts = data?.accounts ?? []

  const [step, setStep] = useState<Step>('capture')
  const [errorKind, setErrorKind] = useState<ErrorKind>('api_error')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  const [scanId, setScanId] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null)

  // Review form state
  const [vendor, setVendor] = useState('')
  const [date, setDate] = useState('')
  const [total, setTotal] = useState('')
  const [category, setCategory] = useState('Other')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [accountId, setAccountId] = useState('')
  const [showLineItems, setShowLineItems] = useState(false)
  const [importing, setImporting] = useState(false)

  // Success state
  const [importedVendor, setImportedVendor] = useState('')
  const [importedAmount, setImportedAmount] = useState(0)
  const [importedAccount, setImportedAccount] = useState('')

  // Scan history
  const [history, setHistory] = useState<InvoiceScan[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (accounts.length && !accountId) {
      const checking = accounts.find(a => a.type === 'checking') ?? accounts[0]
      setAccountId(checking?.id ?? '')
    }
  }, [accounts, accountId])

  const loadHistory = useCallback(async () => {
    const r = await fetch('/api/finances/scan/history')
    if (r.ok) {
      const d = await r.json()
      setHistory(d.scans ?? [])
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  function handleFileSelect(f: File) {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }

  function removeFile() {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function analyse() {
    if (!file) return
    setStep('processing')

    const fd = new FormData()
    fd.append('image', file)

    try {
      const r = await fetch('/api/finances/scan', { method: 'POST', body: fd })
      const d = await r.json()

      if (!r.ok) {
        setErrorKind(d.error === 'not_invoice' ? 'not_invoice' : 'api_error')
        setStep('error')
        return
      }

      setScanId(d.scanId)
      const ex = d.extractedData as ExtractedInvoice
      setExtracted(ex)
      setVendor(ex.vendor ?? '')
      setDate(ex.date ?? new Date().toISOString().slice(0, 10))
      setTotal(String(Math.abs(ex.total ?? 0)))
      setCategory(ex.category ?? 'Other')
      setDescription(ex.description ?? '')
      setStep('review')
      loadHistory()
    } catch {
      setErrorKind('api_error')
      setStep('error')
    }
  }

  async function importTransaction() {
    if (!scanId) return
    setImporting(true)
    try {
      const totalNum = parseFloat(total) || 0
      const r = await fetch(`/api/finances/scan/${scanId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          vendor,
          date,
          total: -Math.abs(totalNum),
          category,
          description,
          notes: notes || undefined,
        }),
      })

      if (!r.ok) {
        setErrorKind('api_error')
        setStep('error')
        return
      }

      const acct = accounts.find(a => a.id === accountId)
      setImportedVendor(vendor)
      setImportedAmount(totalNum)
      setImportedAccount(acct?.name ?? '')
      FinanceStore.invalidate()
      loadHistory()
      setStep('success')
    } finally {
      setImporting(false)
    }
  }

  async function importFromHistory(scan: InvoiceScan) {
    if (!scan.extracted_data) return
    const ex = scan.extracted_data
    setScanId(scan.id)
    setExtracted(ex)
    setVendor(ex.vendor ?? '')
    setDate(ex.date ?? new Date().toISOString().slice(0, 10))
    setTotal(String(Math.abs(ex.total ?? 0)))
    setCategory(ex.category ?? 'Other')
    setDescription(ex.description ?? '')
    setNotes('')
    setStep('review')
  }

  function reset() {
    setStep('capture')
    setFile(null)
    setPreviewUrl(null)
    setScanId(null)
    setExtracted(null)
    setVendor(''); setDate(''); setTotal(''); setCategory('Other'); setDescription(''); setNotes('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    loadHistory()
  }

  const confidence = extracted?.confidence ?? 0

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      {/* ── CAPTURE ── */}
      {step === 'capture' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ color: 'var(--c-fin)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              <Icon name="camera" size={32} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
              {L('Digitalizar Fatura', 'Scan Invoice')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4 }}>
              {L('Tira uma foto ou carrega uma imagem', 'Take a photo or upload an image')}
            </div>
          </div>

          {!file ? (
            <>
              {/* Upload zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: `2px dashed ${dragging ? 'var(--c-fin)' : 'var(--edge)'}`,
                  padding: 40,
                  background: dragging ? 'color-mix(in oklch, var(--c-fin) 5%, transparent)' : 'var(--bg-inset)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color .15s, background .15s',
                  marginBottom: 12,
                }}
              >
                <div style={{ color: 'var(--ink-faint)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon name="upload" size={36} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                  {L('Arrastar ficheiro ou clicar para selecionar', 'Drag file or click to select')}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 6 }}>
                  JPEG, PNG, PDF · {L('Máx 10MB', 'Max 10MB')}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />

              <button
                className="btn btn-accent"
                style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Icon name="camera" size={16} />
                {L('Tirar Foto', 'Take Photo')}
              </button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />
            </>
          ) : (
            <>
              <img
                src={previewUrl ?? ''}
                alt={L('Pré-visualização', 'Preview')}
                style={{ width: '100%', borderRadius: 'var(--radius)', maxHeight: 300, objectFit: 'contain', background: 'var(--bg-inset)' }}
              />
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-faint)' }}
                  onClick={removeFile}
                >
                  {L('Remover', 'Remove')}
                </button>
              </div>
              <button
                className="btn btn-accent"
                style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center', marginTop: 16 } as React.CSSProperties}
                onClick={analyse}
              >
                <Icon name="spark" size={16} />
                {L('Analisar Fatura', 'Analyse Invoice')}
              </button>
            </>
          )}
        </>
      )}

      {/* ── PROCESSING ── */}
      {step === 'processing' && (
        <div style={{ textAlign: 'center' }}>
          {previewUrl && (
            <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxHeight: 300, overflow: 'hidden', borderRadius: 'var(--radius)' }}>
              <img
                src={previewUrl}
                alt=""
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block', background: 'var(--bg-inset)' }}
              />
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--c-fin), transparent)',
                animation: 'scanLine 1.5s ease-in-out infinite',
              }} />
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginTop: 20 }}>
            {L('A analisar...', 'Analysing...')}
          </div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--c-fin)',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {step === 'review' && extracted && (
        <>
          {/* Confidence badge */}
          <div style={{ marginBottom: 16 }}>
            {confidence > 0.8 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'oklch(0.76 0.10 152 / 0.15)', color: 'var(--pos)', fontSize: 12 }}>
                <Icon name="check-circle" size={13} /> {L('Alta confiança', 'High confidence')}
              </span>
            ) : confidence >= 0.5 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'oklch(0.80 0.13 65 / 0.15)', color: 'oklch(0.80 0.13 65)', fontSize: 12 }}>
                <Icon name="warning" size={13} /> {L('Verificar dados', 'Please verify')}
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'oklch(0.66 0.13 30 / 0.15)', color: 'var(--neg)', fontSize: 12 }}>
                <Icon name="x-circle" size={13} /> {L('Baixa confiança — verifique tudo', 'Low confidence — verify all')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>{L('Fornecedor', 'Vendor')}</label>
              <input className="glow-focus" style={inputStyle} value={vendor} onChange={e => setVendor(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{L('Data', 'Date')}</label>
              <input className="glow-focus" style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{L('Total', 'Total')}</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--c-fin)', fontSize: 14, fontWeight: 600, pointerEvents: 'none',
                }}>€</span>
                <input
                  className="glow-focus"
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  type="number"
                  step="0.01"
                  min="0"
                  value={total}
                  onChange={e => setTotal(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{L('Categoria', 'Category')}</label>
              <select className="glow-focus" style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{L('Descrição', 'Description')}</label>
              <input className="glow-focus" style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{L('Notas', 'Notes')}</label>
              <textarea
                className="glow-focus"
                style={{ ...inputStyle, resize: 'none', minHeight: 64 }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={L('Opcional...', 'Optional...')}
              />
            </div>
            <div>
              <label style={labelStyle}>{L('Debitar de', 'Charge to')}</label>
              <select className="glow-focus" style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)}>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({fmt.eur(a.balance)})</option>
                ))}
              </select>
            </div>

            {/* Line items */}
            {extracted.line_items?.length > 0 && (
              <div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-dim)', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
                  onClick={() => setShowLineItems(v => !v)}
                >
                  <Icon name={showLineItems ? 'chevron-up' : 'chevron-down'} size={13} />
                  {L(`Ver itens (${extracted.line_items.length})`, `View items (${extracted.line_items.length})`)}
                </button>
                {showLineItems && (
                  <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--edge)', overflow: 'hidden' }}>
                    {extracted.line_items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < extracted.line_items.length - 1 ? '1px solid var(--edge-soft)' : 'none', fontSize: 12 }}>
                        <span style={{ color: 'var(--ink-soft)' }}>{item.description}</span>
                        <span className="tnum" style={{ color: 'var(--ink-dim)' }}>{fmt.eurc(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-fin)', width: '100%', justifyContent: 'center', marginTop: 20 } as React.CSSProperties}
            onClick={importTransaction}
            disabled={importing || !accountId}
          >
            <Icon name="download" size={16} />
            {importing ? L('A importar...', 'Importing...') : L('Importar Transação', 'Import Transaction')}
          </button>
        </>
      )}

      {/* ── SUCCESS ── */}
      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ color: 'var(--pos)', display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="check-circle" size={48} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {L('Transação importada!', 'Transaction imported!')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 24 }}>
            {importedVendor} · {fmt.eurc(importedAmount)} · {importedAccount}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn" onClick={reset}>
              {L('Digitalizar Outra', 'Scan Another')}
            </button>
            <button
              className="btn btn-accent"
              style={{ '--accent': 'var(--c-fin)' } as React.CSSProperties}
              onClick={onClose}
            >
              {L('Ver Transações', 'View Transactions')}
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === 'error' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ color: 'var(--neg)', display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="x-circle" size={48} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {errorKind === 'not_invoice'
              ? L('Esta imagem não parece uma fatura.', "This doesn't look like an invoice.")
              : L('Ocorreu um erro.', 'An error occurred.')}
          </div>
          <button className="btn btn-accent" style={{ '--accent': 'var(--c-fin)' } as React.CSSProperties} onClick={reset}>
            {L('Tentar Novamente', 'Try Again')}
          </button>
        </div>
      )}

      {/* ── HISTORY ── */}
      {history.length > 0 && step === 'capture' && (
        <div style={{ marginTop: 28, borderTop: '1px solid var(--edge-soft)', paddingTop: 20 }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-dim)', width: '100%', marginBottom: showHistory ? 12 : 0 }}
            onClick={() => setShowHistory(v => !v)}
          >
            <Icon name={showHistory ? 'chevron-up' : 'chevron-down'} size={14} />
            {L('Digitalizações Recentes', 'Recent Scans')}
          </button>

          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.map(scan => {
                const ex = scan.extracted_data
                const dotColor =
                  scan.status === 'imported' ? 'var(--pos)' :
                  scan.status === 'processed' ? 'var(--c-fin)' :
                  scan.status === 'pending' ? 'var(--ink-faint)' : 'var(--neg)'

                return (
                  <div
                    key={scan.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, background: 'transparent', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex?.vendor ?? L('Desconhecido', 'Unknown')}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                        {ex?.date ?? ''}
                      </div>
                    </div>
                    {ex?.total != null && (
                      <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--neg)', whiteSpace: 'nowrap' }}>
                        {fmt.eurc(Math.abs(ex.total))}
                      </span>
                    )}
                    {scan.status === 'processed' && (
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => importFromHistory(scan)}
                      >
                        {L('Importar', 'Import')}
                      </button>
                    )}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
                      {relativeTime(scan.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

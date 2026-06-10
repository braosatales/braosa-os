'use client'
import { useState, useRef, DragEvent } from 'react'
import { Icon, Modal } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { MEAL_META, type MealScanItem } from '@/lib/nutrition'

type MealKey = keyof typeof MEAL_META

type ScanItemState = MealScanItem & {
  editingAmount: boolean
  editAmountValue: string
  editedName: string
  originalAmount: number
  originalCalories: number
  originalProtein: number
  originalCarbs: number
  originalFat: number
  originalFiber: number
}

type Step = 'capture' | 'processing' | 'review' | 'success'

type Props = {
  meal: string
  date: string
  onLogged: () => void
  onClose: () => void
}

export default function MealScanner({ meal, date, onLogged, onClose }: Props) {
  useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('capture')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealKey>((meal as MealKey) || 'lunch')

  const [items, setItems] = useState<ScanItemState[]>([])
  const [mealName, setMealName] = useState('')
  const [overallConfidence, setOverallConfidence] = useState(0)
  const [notes, setNotes] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const [logging, setLogging] = useState(false)
  const [loggedCount, setLoggedCount] = useState(0)
  const [loggedCalories, setLoggedCalories] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function handleFileSelect(f: File) {
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError(null)
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
    setError(null)

    const fd = new FormData()
    fd.append('image', file)
    fd.append('meal', selectedMeal)
    fd.append('date', date)

    try {
      const res = await fetch('/api/nutrition/scan-meal', { method: 'POST', body: fd })
      const d = await res.json()

      if (!res.ok) {
        setError(d.error === 'not_food' ? 'not_food' : 'api_error')
        setStep('capture')
        return
      }

      setMealName(d.mealName ?? '')
      setOverallConfidence(d.confidence ?? 0)
      setNotes(d.notes ?? null)
      setImageUrl(d.imageUrl ?? null)
      setItems(
        ((d.items ?? []) as MealScanItem[]).map(item => ({
          ...item,
          selected: true,
          editingAmount: false,
          editAmountValue: String(item.estimated_amount_g),
          editedName: item.name_pt || item.name,
          originalAmount: item.estimated_amount_g,
          originalCalories: item.calories,
          originalProtein: item.protein_g,
          originalCarbs: item.carbs_g,
          originalFat: item.fat_g,
          originalFiber: item.fiber_g,
        })),
      )
      setStep('review')
    } catch {
      setError('api_error')
      setStep('capture')
    }
  }

  function toggleItem(idx: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))
  }

  function startEditAmount(idx: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, editingAmount: true } : item))
  }

  function updateAmount(idx: number, value: string) {
    const newAmount = parseFloat(value) || 0
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      if (newAmount <= 0 || item.originalAmount <= 0) return { ...item, editAmountValue: value }
      const ratio = newAmount / item.originalAmount
      return {
        ...item,
        editAmountValue: value,
        estimated_amount_g: newAmount,
        calories:  Math.round(item.originalCalories * ratio * 10) / 10,
        protein_g: Math.round(item.originalProtein  * ratio * 10) / 10,
        carbs_g:   Math.round(item.originalCarbs    * ratio * 10) / 10,
        fat_g:     Math.round(item.originalFat      * ratio * 10) / 10,
        fiber_g:   Math.round(item.originalFiber    * ratio * 10) / 10,
        amount_description: `${Math.round(newAmount)}g`,
      }
    }))
  }

  function commitAmount(idx: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, editingAmount: false } : item))
  }

  function updateName(idx: number, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, editedName: value } : item))
  }

  const selectedItems = items.filter(i => i.selected)
  const totalCalories = selectedItems.reduce((s, i) => s + i.calories, 0)
  const totalProtein  = selectedItems.reduce((s, i) => s + i.protein_g, 0)
  const totalCarbs    = selectedItems.reduce((s, i) => s + i.carbs_g, 0)
  const totalFat      = selectedItems.reduce((s, i) => s + i.fat_g, 0)

  async function handleLog() {
    if (selectedItems.length === 0) return
    setLogging(true)
    let count = 0
    let cals = 0
    for (const item of selectedItems) {
      await fetch('/api/nutrition/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          meal: selectedMeal,
          food_name: item.editedName || item.name,
          amount_g: Math.round(item.estimated_amount_g),
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          photo_url: imageUrl,
          ai_identified: true,
        }),
      })
      count++
      cals += item.calories
    }
    setLoggedCount(count)
    setLoggedCalories(Math.round(cals))
    setLogging(false)
    setStep('success')
  }

  function reset() {
    setStep('capture')
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setItems([])
    setMealName('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const confidenceColor = (c: number) =>
    c > 0.8 ? 'var(--pos)' : c >= 0.5 ? 'var(--c-fin)' : 'var(--neg)'

  const sortedMeals = Object.entries(MEAL_META).sort((a, b) => a[1].order - b[1].order)

  return (
    <Modal open onClose={onClose} width={520}>
      <div style={{ padding: 24 }}>

        {/* ── CAPTURE ── */}
        {step === 'capture' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ color: 'var(--c-cal)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                <Icon name="camera" size={32} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                {L('Fotografar Refeição', 'Scan Meal')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4 }}>
                {L('Tira uma foto e o AI identifica os alimentos automaticamente.', 'Take a photo and AI automatically identifies the food.')}
              </div>
            </div>

            {error && (
              <div style={{ background: 'oklch(0.66 0.13 30 / 0.12)', border: '1px solid var(--neg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--neg)' }}>
                {error === 'not_food'
                  ? L('Esta imagem não parece ser comida.', "This doesn't look like a food photo.")
                  : L('Ocorreu um erro. Tenta novamente.', 'An error occurred. Please try again.')}
              </div>
            )}

            {!file ? (
              <>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: `2px dashed ${dragging ? 'var(--c-cal)' : 'var(--edge)'}`,
                    padding: 40,
                    background: dragging ? 'var(--c-cal-dim)' : 'var(--bg-inset)',
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
                    JPEG, PNG, WebP · {L('Máx 10MB', 'Max 10MB')}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />
                <button
                  className="btn btn-accent"
                  style={{ '--accent': 'var(--c-cal)', width: '100%', justifyContent: 'center', marginBottom: 16 } as React.CSSProperties}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Icon name="camera" size={16} />
                  {L('Tirar Foto', 'Take Photo')}
                </button>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleInputChange} />
              </>
            ) : (
              <>
                <img
                  src={previewUrl ?? ''}
                  alt=""
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
              </>
            )}

            {/* Meal selector */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 8 }}>
                {L('Para qual refeição?', 'Which meal is this for?')}
              </div>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {sortedMeals.map(([k, m]) => {
                  const isActive = selectedMeal === k
                  return (
                    <button
                      key={k}
                      onClick={() => setSelectedMeal(k as MealKey)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px',
                        borderRadius: 99,
                        border: isActive ? '1px solid var(--c-cal)' : '1px solid var(--edge)',
                        background: isActive ? 'var(--c-cal-dim)' : 'transparent',
                        color: isActive ? 'var(--c-cal)' : 'var(--ink-dim)',
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Icon name={m.glyph} size={11} />
                      {L(m.label_pt, m.label_en)}
                    </button>
                  )
                })}
              </div>
            </div>

            {file && (
              <button
                className="btn btn-accent"
                style={{ '--accent': 'var(--c-cal)', width: '100%', justifyContent: 'center' } as React.CSSProperties}
                onClick={analyse}
              >
                <Icon name="spark" size={16} />
                {L('Analisar', 'Analyse')}
              </button>
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
                  background: 'linear-gradient(90deg, transparent, var(--c-cal), transparent)',
                  animation: 'scanLine 1.5s ease-in-out infinite',
                }} />
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginTop: 20 }}>
              {L('A identificar alimentos...', 'Identifying foods...')}
            </div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--c-cal)',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {step === 'review' && (
          <>
            {/* Confidence badge */}
            <div style={{ marginBottom: 14 }}>
              {overallConfidence > 0.8 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'oklch(0.76 0.10 152 / 0.15)', color: 'var(--pos)', fontSize: 12 }}>
                  <Icon name="check-circle" size={13} /> {L('Alta confiança', 'High confidence')}
                </span>
              ) : overallConfidence >= 0.5 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'oklch(0.80 0.115 80 / 0.15)', color: 'var(--c-fin)', fontSize: 12 }}>
                  <Icon name="warning" size={13} /> {L('Verificar', 'Please verify')}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'oklch(0.66 0.13 30 / 0.15)', color: 'var(--neg)', fontSize: 12 }}>
                  <Icon name="x-circle" size={13} /> {L('Baixa confiança', 'Low confidence')}
                </span>
              )}
            </div>

            {/* Meal name (editable) */}
            <input
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--edge)',
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--ink)',
                padding: '4px 0',
                marginBottom: 14,
                outline: 'none',
              }}
            />

            {/* AI notes */}
            {notes && (
              <div style={{ background: 'var(--bg-inset)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--ink-faint)', flexShrink: 0, marginTop: 1 }}><Icon name="wand" size={13} /></span>
                <span style={{ fontSize: 12, color: 'var(--ink-dim)', fontStyle: 'italic' }}>{notes}</span>
              </div>
            )}

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--edge-soft)',
                    background: 'var(--bg-raised)',
                    opacity: item.selected ? 1 : 0.4,
                    transition: 'opacity .15s',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(idx)}
                      style={{ cursor: 'pointer', accentColor: 'var(--c-cal)', width: 16, height: 16 }}
                    />
                  </div>

                  {/* Center */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      value={item.editedName}
                      onChange={e => updateName(idx, e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontFamily: 'var(--font-display)',
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: 'var(--ink)',
                        padding: 0,
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                    {item.editingAmount ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <input
                          type="number"
                          value={item.editAmountValue}
                          onChange={e => updateAmount(idx, e.target.value)}
                          onBlur={() => commitAmount(idx)}
                          autoFocus
                          min={1}
                          style={{
                            width: 72, background: 'var(--bg-inset)', border: '1px solid var(--c-cal)',
                            borderRadius: 5, padding: '3px 7px', color: 'var(--ink)', fontSize: 12, outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>g</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditAmount(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-dim)', padding: '2px 0', textAlign: 'left', marginTop: 2 }}
                      >
                        {item.amount_description}
                      </button>
                    )}
                    {/* Confidence bar */}
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-inset)', marginTop: 6, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${item.confidence * 100}%`,
                        borderRadius: 99,
                        background: confidenceColor(item.confidence),
                      }} />
                    </div>
                  </div>

                  {/* Calories */}
                  <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', flexShrink: 0, paddingTop: 2 }}>
                    {Math.round(item.calories)} kcal
                  </div>
                </div>
              ))}
            </div>

            {/* Totals row */}
            {selectedItems.length > 0 && (
              <div style={{ background: 'var(--c-cal-dim)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 14 }}>
                <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--c-cal)', fontWeight: 600 }}>
                  Total: {Math.round(totalCalories)} kcal · P {Math.round(totalProtein)}g · H {Math.round(totalCarbs)}g · G {Math.round(totalFat)}g
                </span>
              </div>
            )}

            <button
              className="btn btn-accent"
              style={{ '--accent': 'var(--c-cal)', width: '100%', justifyContent: 'center', marginBottom: 10 } as React.CSSProperties}
              onClick={handleLog}
              disabled={logging || selectedItems.length === 0}
            >
              <Icon name="plus" size={16} />
              {logging ? L('A adicionar...', 'Adding...') : L('Adicionar à Refeição', 'Add to Meal')}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-faint)', textDecoration: 'underline' }}
                onClick={onClose}
              >
                {L('Adicionar Manualmente', 'Add Manually')}
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--pos)', display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="check-circle" size={48} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {L('Refeição registada!', 'Meal logged!')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 24 }}>
              {loggedCount} {L('alimentos', 'foods')} · {loggedCalories} kcal
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn" onClick={reset}>
                {L('Fotografar Outra', 'Scan Another')}
              </button>
              <button
                className="btn btn-accent"
                style={{ '--accent': 'var(--c-cal)' } as React.CSSProperties}
                onClick={() => { onLogged(); onClose() }}
              >
                {L('Ver Diário', 'View Diary')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

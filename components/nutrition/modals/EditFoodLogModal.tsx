'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui'
import { L } from '@/lib/i18n'
import type { FoodLog } from '@/lib/nutrition'

type Props = {
  log: FoodLog
  onClose: () => void
  onSaved: () => void
}

export default function EditFoodLogModal({ log, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState(String(log.amount_g))
  const [notes, setNotes] = useState(log.notes ?? '')
  const [saving, setSaving] = useState(false)

  const ratio = parseFloat(amount) / log.amount_g || 1
  const calories = Math.round(log.calories * ratio)
  const protein  = Math.round(log.protein_g * ratio * 10) / 10
  const carbs    = Math.round(log.carbs_g   * ratio * 10) / 10
  const fat      = Math.round(log.fat_g     * ratio * 10) / 10

  const handleSave = async () => {
    setSaving(true)
    const amountG = parseFloat(amount)
    if (isNaN(amountG) || amountG <= 0) { setSaving(false); return }

    await fetch(`/api/nutrition/logs/${log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_g: amountG,
        calories: Math.round(log.calories * (amountG / log.amount_g)),
        protein_g: Math.round(log.protein_g * (amountG / log.amount_g) * 10) / 10,
        carbs_g:   Math.round(log.carbs_g   * (amountG / log.amount_g) * 10) / 10,
        fat_g:     Math.round(log.fat_g     * (amountG / log.amount_g) * 10) / 10,
        fiber_g:   Math.round(log.fiber_g   * (amountG / log.amount_g) * 10) / 10,
        notes: notes || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} width={380}>
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          {log.food_name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 20 }}>
          {L('Editar quantidade', 'Edit amount')}
        </div>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
          {L('Quantidade (g)', 'Amount (g)')}
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-inset)',
            border: '1px solid var(--edge)',
            borderRadius: 8,
            padding: '10px 12px',
            color: 'var(--ink)',
            fontSize: 15,
            marginBottom: 16,
          }}
          min={1}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginBottom: 20 }}>
          {[
            { label: 'kcal', value: calories },
            { label: 'P',    value: `${protein}g` },
            { label: 'H',    value: `${carbs}g` },
            { label: 'G',    value: `${fat}g` },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{item.value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
          {L('Notas (opcional)', 'Notes (optional)')}
        </label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={L('Ex: almoço no escritório', 'e.g. lunch at the office')}
          style={{
            width: '100%',
            background: 'var(--bg-inset)',
            border: '1px solid var(--edge)',
            borderRadius: 8,
            padding: '9px 12px',
            color: 'var(--ink)',
            fontSize: 13,
            marginBottom: 20,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>{L('Cancelar', 'Cancel')}</button>
          <button
            className="btn btn-accent"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, '--accent': 'var(--c-cal)' } as React.CSSProperties}
          >
            {saving ? L('A guardar...', 'Saving...') : L('Guardar', 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

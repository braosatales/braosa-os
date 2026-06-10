'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon, Modal } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { MEAL_META, type Food, calculateMacrosForAmount } from '@/lib/nutrition'
import { useNutrition } from '../NutritionShell'
import MealScanner from '../MealScanner'

type MealKey = keyof typeof MEAL_META

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{
      background: `color-mix(in oklch, ${color} 15%, transparent)`,
      color,
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 5px',
      borderRadius: 4,
    }}>
      {label}{Math.round(value)}g
    </span>
  )
}

type AddFoodModalProps = {
  food: Food | null
  customName?: string
  meal: MealKey
  date: string
  onClose: () => void
  onAdded: () => void
}

function AddFoodModal({ food, customName, meal, date, onClose, onAdded }: AddFoodModalProps) {
  const lang = useLang()
  const [amount, setAmount] = useState(String(food?.serving_size_g ?? 100))
  const [unit, setUnit]     = useState<'g' | 'serving'>('serving')
  const [selectedMeal, setSelectedMeal] = useState<MealKey>(meal)
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [foodName, setFoodName] = useState(customName ?? (lang === 'pt' ? (food?.name_pt || food?.name || '') : food?.name || ''))

  const amountG = unit === 'serving' && food ? food.serving_size_g : parseFloat(amount) || 100
  const macros = food ? calculateMacrosForAmount(food, amountG) : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }

  const handleAdd = async () => {
    setSaving(true)
    const body: Record<string, unknown> = {
      date,
      meal: selectedMeal,
      food_id: food?.id ?? null,
      food_name: foodName || food?.name || customName || 'Food',
      amount_g: amountG,
      calories:  macros.calories,
      protein_g: macros.protein_g,
      carbs_g:   macros.carbs_g,
      fat_g:     macros.fat_g,
      fiber_g:   macros.fiber_g,
      notes: notes || null,
    }
    const res = await fetch('/api/nutrition/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) onAdded()
  }

  return (
    <Modal open onClose={onClose} width={420}>
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
          {L('Adicionar Alimento', 'Add Food')}
        </div>
        {food?.brand && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 12 }}>{food.brand}</div>
        )}

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
          {L('Nome', 'Name')}
        </label>
        <input
          value={foodName}
          onChange={e => setFoodName(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13, marginBottom: 16 }}
        />

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
              {L('Quantidade', 'Amount')}
            </label>
            <input
              type="number"
              value={unit === 'serving' && food ? String(food.serving_size_g) : amount}
              onChange={e => setAmount(e.target.value)}
              disabled={unit === 'serving'}
              style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 14 }}
              min={1}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
              {L('Unidade', 'Unit')}
            </label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as 'g' | 'serving')}
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 10px', color: 'var(--ink)', fontSize: 13 }}
            >
              {food && <option value="serving">{food.serving_label}</option>}
              <option value="g">g</option>
            </select>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
          {L('Refeição', 'Meal')}
        </label>
        <select
          value={selectedMeal}
          onChange={e => setSelectedMeal(e.target.value as MealKey)}
          style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13, marginBottom: 16 }}
        >
          {Object.entries(MEAL_META).sort((a, b) => a[1].order - b[1].order).map(([k, m]) => (
            <option key={k} value={k}>{L(m.label_pt, m.label_en)}</option>
          ))}
        </select>

        {/* Macro preview */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', background: 'var(--bg-inset)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          {[
            { label: 'kcal',  value: Math.round(macros.calories) },
            { label: L('Prot', 'Prot'), value: `${Math.round(macros.protein_g)}g` },
            { label: L('Hidr', 'Carbs'), value: `${Math.round(macros.carbs_g)}g` },
            { label: L('Gord', 'Fat'), value: `${Math.round(macros.fat_g)}g` },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{item.value}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 6 }}>
          {L('Notas (opcional)', 'Notes (optional)')}
        </label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={L('Opcional...', 'Optional...')}
          style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13, marginBottom: 20 }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>{L('Cancelar', 'Cancel')}</button>
          <button
            className="btn btn-accent"
            onClick={handleAdd}
            disabled={saving}
            style={{ flex: 1, '--accent': 'var(--c-cal)' } as React.CSSProperties}
          >
            {saving ? L('A adicionar...', 'Adding...') : L('Adicionar', 'Add')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

type CreateFoodModalProps = {
  onClose: () => void
  onCreated: (food: Food) => void
}

function CreateFoodModal({ onClose, onCreated }: CreateFoodModalProps) {
  const [form, setForm] = useState({ name: '', name_pt: '', brand: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', fiber_per_100g: '', serving_size_g: '100', serving_label: '100g' })
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async () => {
    setSaving(true)
    const res = await fetch('/api/nutrition/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        name_pt: form.name_pt || null,
        brand: form.brand || null,
        calories_per_100g: parseFloat(form.calories_per_100g) || 0,
        protein_per_100g: parseFloat(form.protein_per_100g) || 0,
        carbs_per_100g: parseFloat(form.carbs_per_100g) || 0,
        fat_per_100g: parseFloat(form.fat_per_100g) || 0,
        fiber_per_100g: parseFloat(form.fiber_per_100g) || 0,
        serving_size_g: parseFloat(form.serving_size_g) || 100,
        serving_label: form.serving_label || '100g',
      }),
    })
    setSaving(false)
    if (res.ok) {
      const d = await res.json()
      onCreated(d.food)
    }
  }

  const field = (label: string, key: string, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={form[key as keyof typeof form]}
        onChange={set(key)}
        style={{ width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--edge)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)', fontSize: 13 }}
      />
    </div>
  )

  return (
    <Modal open onClose={onClose} width={480}>
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 20 }}>
          {L('Criar Alimento', 'Create Food')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={{ gridColumn: 'span 2' }}>{field(L('Nome (EN)', 'Name (EN)'), 'name')}</div>
          <div style={{ gridColumn: 'span 2' }}>{field(L('Nome PT', 'Name PT'), 'name_pt')}</div>
          <div style={{ gridColumn: 'span 2' }}>{field(L('Marca', 'Brand'), 'brand')}</div>
          {field(L('Calorias /100g', 'Calories /100g'), 'calories_per_100g', 'number')}
          {field(L('Proteína /100g', 'Protein /100g'), 'protein_per_100g', 'number')}
          {field(L('Hidratos /100g', 'Carbs /100g'), 'carbs_per_100g', 'number')}
          {field(L('Gordura /100g', 'Fat /100g'), 'fat_per_100g', 'number')}
          {field(L('Fibra /100g', 'Fiber /100g'), 'fiber_per_100g', 'number')}
          {field(L('Dose (g)', 'Serving (g)'), 'serving_size_g', 'number')}
          <div style={{ gridColumn: 'span 2' }}>{field(L('Etiqueta da dose', 'Serving label'), 'serving_label')}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>{L('Cancelar', 'Cancel')}</button>
          <button
            className="btn btn-accent"
            onClick={handleCreate}
            disabled={saving || !form.name || !form.calories_per_100g}
            style={{ flex: 1, '--accent': 'var(--c-cal)' } as React.CSSProperties}
          >
            {saving ? L('A criar...', 'Creating...') : L('Criar', 'Create')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function LogFoodView() {
  useLang()
  const isMobile = useIsMobile()
  const { logDate, logMeal } = useNutrition()

  const [selectedMeal, setSelectedMeal] = useState<MealKey>(logMeal as MealKey || 'breakfast')
  const [query, setQuery] = useState('')
  const [foods, setFoods] = useState<Food[]>([])
  const [recent, setRecent] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRecent = useCallback(async () => {
    const res = await fetch('/api/nutrition/logs?date=' + new Date().toISOString().split('T')[0])
    // use a broader approach - just fetch popular foods as fallback
  }, [])

  useEffect(() => {
    fetchRecent()
    // Load recently used foods from the last 7 days via logs
    fetch('/api/nutrition/logs?date=' + new Date().toISOString().split('T')[0])
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => {
        const names: string[] = []
        const seen = new Set<string>()
        for (const log of (d.logs ?? [])) {
          if (!seen.has(log.food_name)) {
            seen.add(log.food_name)
            names.push(log.food_name)
          }
        }
      })
      .catch(() => {})

    fetch('/api/nutrition/foods?limit=8')
      .then(r => r.ok ? r.json() : { foods: [] })
      .then(d => setRecent(d.foods ?? []))
      .catch(() => {})
  }, [fetchRecent])

  useEffect(() => {
    if (!query.trim()) { setFoods([]); return }
    setSearching(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/nutrition/foods?search=${encodeURIComponent(query)}&limit=20`)
      if (res.ok) {
        const d = await res.json()
        setFoods(d.foods ?? [])
      }
      setSearching(false)
    }, 300)
  }, [query])

  const openAdd = (food: Food) => {
    setSelectedFood(food)
    setShowAdd(true)
  }

  const handleAdded = () => {
    setShowAdd(false)
    setSelectedFood(null)
    setQuery('')
  }

  const handleCreated = (food: Food) => {
    setShowCreate(false)
    setSelectedFood(food)
    setShowAdd(true)
  }

  return (
    <div style={{ padding: isMobile ? '16px 16px 80px' : 24, maxWidth: 600, margin: '0 auto' }}>

      {/* Meal selector */}
      <div
        className="hide-scrollbar"
        style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}
      >
        {Object.entries(MEAL_META).sort((a, b) => a[1].order - b[1].order).map(([k, m]) => {
          const isActive = selectedMeal === k
          return (
            <button
              key={k}
              onClick={() => setSelectedMeal(k as MealKey)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 99,
                border: isActive ? `1px solid var(--c-cal)` : '1px solid var(--edge)',
                background: isActive ? 'var(--c-cal-dim)' : 'transparent',
                color: isActive ? 'var(--c-cal)' : 'var(--ink-dim)',
                fontSize: 12.5,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name={m.glyph} size={12} />
              {L(m.label_pt, m.label_en)}
            </button>
          )
        })}
      </div>

      {/* Scan meal button */}
      <button
        className="btn"
        onClick={() => setShowScanner(true)}
        style={{ width: '100%', justifyContent: 'center', marginBottom: 16, color: 'var(--c-cal)' }}
      >
        <Icon name="camera" size={15} />
        {L('Fotografar Refeição', 'Scan Meal')}
      </button>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Icon name="search" size={16} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={L('Pesquisar alimento...', 'Search food...')}
          style={{
            width: '100%',
            background: 'var(--bg-raised)',
            border: '1px solid var(--edge)',
            borderRadius: 10,
            padding: '12px 16px 12px 40px',
            color: 'var(--ink)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }}>
          <Icon name="search" size={16} />
        </span>
      </div>

      {/* Search results */}
      {query.trim() ? (
        <div>
          {searching ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '12px 0' }}>{L('A pesquisar...', 'Searching...')}</div>
          ) : foods.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {foods.map(food => (
                <FoodSearchRow key={food.id} food={food} onSelect={() => openAdd(food)} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 12 }}>
                {L('Sem resultados para', 'No results for')} "{query}"
              </div>
              <button
                className="btn"
                onClick={() => setShowCreate(true)}
                style={{ fontSize: 13 }}
              >
                <Icon name="plus" size={14} />
                {L('Criar Alimento', 'Create Food')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Recent foods */}
          {recent.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.12em', marginBottom: 10 }}>
                {L('RECENTES', 'RECENT')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recent.map(food => (
                  <FoodSearchRow key={food.id} food={food} onSelect={() => openAdd(food)} />
                ))}
              </div>
            </div>
          )}

          {/* Quick adds */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.12em', marginBottom: 10 }}>
              {L('ACESSO RÁPIDO', 'QUICK ADD')}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { name_pt: 'Café', name: 'Coffee', calories: 2, serving: 240 },
                { name_pt: 'Maçã', name: 'Apple',  calories: 52, serving: 150 },
                { name_pt: 'Banana', name: 'Banana', calories: 89, serving: 120 },
              ].map(item => (
                <button
                  key={item.name}
                  className="btn"
                  onClick={() => {
                    const food: Food = {
                      id: '', user_id: null, name: item.name, name_pt: item.name_pt,
                      brand: null, calories_per_100g: Math.round(item.calories * 100 / item.serving),
                      protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0, fiber_per_100g: 0,
                      serving_size_g: item.serving, serving_label: '1 porção',
                      barcode: null, verified: false,
                    }
                    openAdd(food)
                  }}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  {L(item.name_pt, item.name)} · {item.calories} kcal
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button className="btn" onClick={() => setShowCreate(true)} style={{ fontSize: 13 }}>
              <Icon name="plus" size={14} />
              {L('Criar Alimento Personalizado', 'Create Custom Food')}
            </button>
          </div>
        </>
      )}

      {showAdd && selectedFood && (
        <AddFoodModal
          food={selectedFood}
          meal={selectedMeal}
          date={logDate}
          onClose={() => { setShowAdd(false); setSelectedFood(null) }}
          onAdded={handleAdded}
        />
      )}
      {showCreate && (
        <CreateFoodModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showScanner && (
        <MealScanner
          meal={selectedMeal}
          date={logDate}
          onLogged={() => setShowScanner(false)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

function FoodSearchRow({ food, onSelect }: { food: Food; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        background: 'var(--bg-raised)',
        border: '1px solid var(--edge-soft)',
        alignItems: 'center',
        transition: 'background .12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-raised)')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>
          {food.name_pt ?? food.name}
          {food.verified && (
            <span style={{ marginLeft: 6, color: 'var(--pos)', fontSize: 10 }}>✓</span>
          )}
        </div>
        {food.brand && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>{food.brand}</div>
        )}
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <MacroChip label="P" value={food.protein_per_100g} color="var(--c-health)" />
          <MacroChip label="H" value={food.carbs_per_100g}   color="var(--c-fin)"    />
          <MacroChip label="G" value={food.fat_per_100g}     color="var(--c-task)"   />
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 13, color: 'var(--ink-dim)', flexShrink: 0 }}>
        {Math.round(food.calories_per_100g)} kcal
        <div style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'right' }}>/100g</div>
      </div>
    </div>
  )
}

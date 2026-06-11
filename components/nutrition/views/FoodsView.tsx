'use client'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { Food } from '@/lib/nutrition'
import { useNutrition } from '../NutritionShell'

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{ background: `color-mix(in oklch, ${color} 15%, transparent)`, color, fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4 }}>
      {label}{Math.round(value)}g
    </span>
  )
}

export default function FoodsView() {
  useLang()
  const isMobile = useIsMobile()
  const { navigateTo } = useNutrition()

  const [query, setQuery]       = useState('')
  const [myFoods, setMyFoods]   = useState(false)
  const [foods, setFoods]       = useState<Food[]>([])
  const [loading, setLoading]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchFoods = (search: string, onlyMine: boolean) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '40' })
    if (search.trim()) params.set('search', search)
    fetch(`/api/nutrition/foods?${params}`)
      .then(r => r.ok ? r.json() : { foods: [] })
      .then(d => {
        let list: Food[] = d.foods ?? []
        if (onlyMine) list = list.filter(f => f.user_id !== null)
        setFoods(list)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchFoods(query, myFoods), 300)
  }, [query, myFoods])

  const handleDelete = async (id: string) => {
    if (!confirm(L('Apagar este alimento?', 'Delete this food?'))) return
    setDeleting(id)
    await fetch(`/api/nutrition/foods`, { method: 'DELETE' })
    setDeleting(null)
    fetchFoods(query, myFoods)
  }

  return (
    <div style={{ padding: isMobile ? '16px 16px 80px' : 24, maxWidth: 680, margin: '0 auto' }}>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={L('Pesquisar alimentos...', 'Search foods...')}
            style={{
              width: '100%',
              background: 'var(--bg-raised)',
              border: '1px solid var(--edge)',
              borderRadius: 10,
              padding: '10px 16px 10px 40px',
              color: 'var(--ink)',
              fontSize: 13,
            }}
          />
        </div>
        <button
          className="btn"
          onClick={() => setMyFoods(v => !v)}
          style={{
            fontSize: 12,
            background: myFoods ? 'var(--c-nutrition-dim)' : undefined,
            color: myFoods ? 'var(--c-nutrition)' : undefined,
            borderColor: myFoods ? 'var(--c-nutrition)' : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {L('Os meus', 'My foods')}
        </button>
      </div>

      {/* Foods list */}
      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          {L('A carregar...', 'Loading...')}
        </div>
      ) : foods.length === 0 ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          {L('Sem alimentos encontrados', 'No foods found')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {foods.map(food => (
            <div
              key={food.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--bg-raised)',
                border: '1px solid var(--edge-soft)',
                cursor: 'pointer',
                transition: 'background .12s',
              }}
              onClick={() => navigateTo('log')}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-raised)')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>
                    {food.name_pt ?? food.name}
                  </span>
                  {food.verified && (
                    <span style={{ color: 'var(--pos)', fontSize: 11 }}>✓</span>
                  )}
                  {food.user_id && (
                    <span style={{ fontSize: 10, color: 'var(--c-nutrition)', background: 'var(--c-nutrition-dim)', padding: '1px 5px', borderRadius: 4 }}>
                      {L('meu', 'mine')}
                    </span>
                  )}
                </div>
                {food.brand && (
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>{food.brand}</div>
                )}
                <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                  <MacroChip label="P" value={food.protein_per_100g} color="var(--c-health)" />
                  <MacroChip label="H" value={food.carbs_per_100g}   color="var(--c-fin)"    />
                  <MacroChip label="G" value={food.fat_per_100g}     color="var(--c-task)"   />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="tnum" style={{ fontSize: 13, color: 'var(--ink-dim)', fontWeight: 600 }}>
                  {Math.round(food.calories_per_100g)} kcal
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>/100g</div>
              </div>
              {food.user_id && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(food.id) }}
                  disabled={deleting === food.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: '2px 4px', opacity: deleting === food.id ? 0.5 : 1 }}
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

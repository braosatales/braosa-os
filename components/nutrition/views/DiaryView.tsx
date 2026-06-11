'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon, Ring } from '@/components/ui'
import { useLang, L } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { MEAL_META, type FoodLog, type NutritionProfile, sumDayTotals } from '@/lib/nutrition'
import { useNutrition } from '../NutritionShell'
import EditFoodLogModal from '../modals/EditFoodLogModal'
import MealScanner from '../MealScanner'

function todayStr() { return new Date().toISOString().split('T')[0] }
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}
function formatDisplayDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (lang === 'pt') {
    return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
      .replace(/^(.)/, c => c.toUpperCase())
  }
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function waterKey(date: string) { return `braosa-water-${date}` }
function loadWater(date: string): boolean[] {
  try { return JSON.parse(localStorage.getItem(waterKey(date)) ?? 'null') ?? Array(8).fill(false) }
  catch { return Array(8).fill(false) }
}
function saveWater(date: string, drops: boolean[]) {
  localStorage.setItem(waterKey(date), JSON.stringify(drops))
}

export default function DiaryView() {
  const lang = useLang()
  const isMobile = useIsMobile()
  const { navigateTo, logDate: contextDate } = useNutrition()

  const [date, setDate] = useState(contextDate || todayStr())
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [profile, setProfile] = useState<NutritionProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [water, setWater] = useState<boolean[]>(Array(8).fill(false))
  const [editLog, setEditLog] = useState<FoodLog | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showScanner, setShowScanner] = useState(false)
  const [scannerMeal, setScannerMeal] = useState<string>('lunch')

  useEffect(() => {
    setWater(loadWater(date))
  }, [date])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [logsRes, profileRes] = await Promise.all([
      fetch(`/api/nutrition/logs?date=${date}`),
      fetch('/api/nutrition/profile'),
    ])
    if (logsRes.ok) {
      const d = await logsRes.json()
      setLogs(d.logs ?? [])
    }
    if (profileRes.ok) {
      const d = await profileRes.json()
      setProfile(d.profile)
    }
    setLoading(false)
  }, [date])

  useEffect(() => { fetchData() }, [fetchData])

  const totals = sumDayTotals(logs)
  const target = {
    calories:  profile?.target_calories  ?? 2150,
    protein_g: profile?.target_protein_g ?? 170,
    carbs_g:   profile?.target_carbs_g   ?? 215,
    fat_g:     profile?.target_fat_g     ?? 65,
    water_ml:  profile?.target_water_ml  ?? 2500,
  }

  const calRatio = Math.min(1, totals.calories / target.calories)
  const calPct   = totals.calories / target.calories
  const ringColor = calPct < 0.9 ? 'var(--pos)' : calPct <= 1.1 ? 'var(--c-fin)' : 'var(--neg)'

  const filledDrops = water.filter(Boolean).length
  const waterMl = filledDrops * Math.round(target.water_ml / 8)

  const toggleDrop = (i: number) => {
    const next = water.map((v, idx) => idx === i ? !v : v)
    setWater(next)
    saveWater(date, next)
  }

  const toggleCollapse = (meal: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(meal)) next.delete(meal)
      else next.add(meal)
      return next
    })
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/nutrition/logs/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const sortedMeals = Object.entries(MEAL_META).sort((a, b) => a[1].order - b[1].order)

  return (
    <div style={{ padding: isMobile ? '16px 16px 80px' : 24, maxWidth: 680, margin: '0 auto' }}>

      {/* ── Date navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          className="btn"
          onClick={() => setDate(d => addDays(d, -1))}
          style={{ padding: '6px 12px', fontSize: 13 }}
        >
          <Icon name="chevron-left" size={14} />
          {L('Anterior', 'Yesterday')}
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          {date === todayStr() && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--c-nutrition)', letterSpacing: '0.12em', marginBottom: 2 }}>
              {L('HOJE', 'TODAY')}
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {formatDisplayDate(date, lang)}
          </div>
        </div>
        <button
          className="btn"
          onClick={() => setDate(d => addDays(d, 1))}
          style={{ padding: '6px 12px', fontSize: 13 }}
          disabled={date >= todayStr()}
        >
          {L('Próximo', 'Next')}
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
      {date !== todayStr() && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button className="btn" onClick={() => setDate(todayStr())} style={{ fontSize: 12, padding: '5px 12px' }}>
            {L('Hoje', 'Today')}
          </button>
        </div>
      )}

      {/* ── Daily summary ── */}
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--edge-soft)',
        borderRadius: 'var(--radius)',
        padding: 20,
        marginBottom: 20,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
      }}>
        {/* Calorie ring */}
        <Ring value={calRatio} color={ringColor} size={80} stroke={8}>
          <div style={{ textAlign: 'center' }}>
            <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
              {Math.round(totals.calories)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>kcal</div>
          </div>
        </Ring>

        {/* Macro bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: L('Proteína', 'Protein'), value: totals.protein_g, target: target.protein_g, color: 'var(--c-health)' },
            { label: L('Hidratos', 'Carbs'),   value: totals.carbs_g,   target: target.carbs_g,   color: 'var(--c-fin)'    },
            { label: L('Gordura', 'Fat'),       value: totals.fat_g,     target: target.fat_g,     color: 'var(--c-task)'   },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 56, fontSize: 11, color: 'var(--ink-dim)', fontWeight: 500 }}>{m.label}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                  borderRadius: 99,
                  background: m.color,
                  transition: 'width .4s ease',
                }} />
              </div>
              <div className="tnum" style={{ fontSize: 11, color: 'var(--ink-dim)', width: 70, textAlign: 'right' }}>
                {Math.round(m.value)}g / {m.target}g
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
            {L(`de ${target.calories} kcal`, `of ${target.calories} kcal`)}
          </div>
        </div>
      </div>

      {/* ── Water tracker ── */}
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--edge-soft)',
        borderRadius: 'var(--radius)',
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {water.map((filled, i) => (
            <button
              key={i}
              onClick={() => toggleDrop(i)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                color: filled ? 'var(--c-mail)' : 'var(--ink-faint)',
                transition: 'color .15s',
              }}
            >
              <Icon name="droplet" size={18} />
            </button>
          ))}
        </div>
        <div className="tnum" style={{ fontSize: 12, color: 'var(--ink-dim)', marginLeft: 'auto' }}>
          {(waterMl / 1000).toFixed(1)}L / {(target.water_ml / 1000).toFixed(1)}L
        </div>
      </div>

      {/* ── Meal sections ── */}
      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: 40 }}>
          {L('A carregar...', 'Loading...')}
        </div>
      ) : (
        <>
          {sortedMeals.map(([mealKey, meta]) => {
            const mealLogs = logs.filter(l => l.meal === mealKey)
            const mealCals = mealLogs.reduce((s, l) => s + l.calories, 0)
            const isCollapsed = collapsed.has(mealKey)

            return (
              <div
                key={mealKey}
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--edge-soft)',
                  borderRadius: 'var(--radius)',
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                {/* Meal header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  minHeight: 44,
                }}
                  onClick={() => toggleCollapse(mealKey)}
                >
                  <span style={{ color: meta.color }}>
                    <Icon name={meta.glyph} size={15} />
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)', flex: 1 }}>
                    {L(meta.label_pt, meta.label_en)}
                  </span>
                  {mealCals > 0 && (
                    <span className="tnum" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                      {Math.round(mealCals)} kcal
                    </span>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setScannerMeal(mealKey)
                      setShowScanner(true)
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--edge)',
                      borderRadius: 6,
                      color: 'var(--c-nutrition)',
                      fontSize: 12,
                      padding: '3px 7px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={L('Fotografar refeição', 'Scan meal')}
                  >
                    <Icon name="camera" size={11} />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      navigateTo('log', date, mealKey)
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--edge)',
                      borderRadius: 6,
                      color: 'var(--c-nutrition)',
                      fontSize: 12,
                      padding: '3px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name="plus" size={11} />
                    {L('Adicionar', 'Add')}
                  </button>
                  <span style={{ color: 'var(--ink-faint)', marginLeft: 4 }}>
                    <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={14} />
                  </span>
                </div>

                {/* Food rows */}
                {!isCollapsed && (
                  <div style={{ borderTop: '1px solid var(--edge-soft)' }}>
                    {mealLogs.length === 0 ? (
                      <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--ink-faint)' }}>
                        {L('Nada registado', 'Nothing logged')}
                      </div>
                    ) : (
                      mealLogs.map(log => (
                        <FoodRow
                          key={log.id}
                          log={log}
                          onEdit={() => setEditLog(log)}
                          onDelete={() => handleDelete(log.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Daily total */}
          {logs.length > 0 && (
            <div style={{
              borderTop: '1px solid var(--edge)',
              paddingTop: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 4px',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                {L('Total', 'Total')}
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <MacroBadge label="P" value={totals.protein_g} color="var(--c-health)" />
                <MacroBadge label="H" value={totals.carbs_g}   color="var(--c-fin)"    />
                <MacroBadge label="G" value={totals.fat_g}     color="var(--c-task)"   />
                <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', minWidth: 60, textAlign: 'right' }}>
                  {Math.round(totals.calories)} kcal
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {editLog && (
        <EditFoodLogModal
          log={editLog}
          onClose={() => setEditLog(null)}
          onSaved={() => { setEditLog(null); fetchData() }}
        />
      )}

      {showScanner && (
        <MealScanner
          meal={scannerMeal}
          date={date}
          onLogged={fetchData}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Camera FAB */}
      <button
        onClick={() => { setScannerMeal('lunch'); setShowScanner(true) }}
        style={{
          position: 'fixed',
          bottom: isMobile ? 'calc(20px + env(safe-area-inset-bottom))' : 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--c-nutrition)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'oklch(0.18 0.01 80)',
          zIndex: 50,
          boxShadow: `0 0 calc(30px * var(--glow)) -6px var(--c-nutrition)`,
        }}
        title={L('Fotografar refeição', 'Scan meal')}
      >
        <Icon name="camera" size={22} />
      </button>
    </div>
  )
}

function FoodRow({ log, onEdit, onDelete }: { log: FoodLog; onEdit: () => void; onDelete: () => void }) {
  const [showDelete, setShowDelete] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(0)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < 0) setSwipeX(Math.max(delta, -120))
  }
  function handleTouchEnd() {
    if (swipeX < -120) {
      onDelete()
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
        borderBottom: '1px solid var(--edge-soft)', cursor: 'pointer',
        transform: `translateX(${swipeX}px)`,
        transition: swipeX === 0 ? 'transform 0.2s' : 'none',
        position: 'relative',
      }}
      onClick={swipeX === 0 ? onEdit : undefined}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {log.food_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>
          {log.amount_g}g
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <MacroBadge label="P" value={log.protein_g} color="var(--c-health)" />
        <MacroBadge label="H" value={log.carbs_g}   color="var(--c-fin)"    />
        <MacroBadge label="G" value={log.fat_g}     color="var(--c-task)"   />
      </div>
      <span className="tnum" style={{ fontSize: 13, color: 'var(--ink-dim)', minWidth: 52, textAlign: 'right' }}>
        {Math.round(log.calories)} kcal
      </span>
      {showDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: '0 4px' }}
        >
          <Icon name="trash" size={14} />
        </button>
      )}
    </div>
  )
}

function MacroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{
      background: `color-mix(in oklch, ${color} 15%, transparent)`,
      color,
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 5px',
      borderRadius: 4,
      fontFamily: 'var(--font-mono)',
    }}>
      {label}{Math.round(value)}g
    </span>
  )
}

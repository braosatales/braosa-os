'use client'
import { useState, useEffect, useCallback } from 'react'
import { useLang, L } from '@/lib/i18n'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { calculateTDEE, calculateWeightLossPace, type NutritionProfile } from '@/lib/nutrition'

const ACTIVITY_LEVELS = [
  { id: 'sedentary',   label_pt: 'Sedentário',    label_en: 'Sedentary',    desc_pt: '< 1x/semana',    desc_en: '< 1x/week'    },
  { id: 'light',       label_pt: 'Leve',          label_en: 'Light',        desc_pt: '1-3x/semana',    desc_en: '1-3x/week'    },
  { id: 'moderate',    label_pt: 'Moderado',      label_en: 'Moderate',     desc_pt: '3-5x/semana',    desc_en: '3-5x/week'    },
  { id: 'active',      label_pt: 'Ativo',         label_en: 'Active',       desc_pt: '5-6x/semana',    desc_en: '5-6x/week'    },
  { id: 'very_active', label_pt: 'Muito Ativo',   label_en: 'Very Active',  desc_pt: 'Diariamente',    desc_en: 'Daily'        },
]

const GOALS = [
  { id: 'lose_fat',      label_pt: 'Perder Gordura', label_en: 'Lose Fat',      emoji: '🔥', deficit: 500 },
  { id: 'maintain',      label_pt: 'Manter',         label_en: 'Maintain',      emoji: '⚖️', deficit: 0  },
  { id: 'build_muscle',  label_pt: 'Ganhar Músculo', label_en: 'Build Muscle',  emoji: '💪', deficit: -250 },
]

export default function GoalsView() {
  useLang()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState<NutritionProfile | null>(null)
  const [form, setForm]       = useState<Partial<NutritionProfile>>({})
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [customize, setCustomize] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/nutrition/profile')
    if (res.ok) {
      const d = await res.json()
      setProfile(d.profile)
      setForm(d.profile)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const merged: NutritionProfile = { ...(profile ?? {} as NutritionProfile), ...form } as NutritionProfile
  const tdee = merged.current_weight_kg ? calculateTDEE(merged) : 0
  const goalMeta = GOALS.find(g => g.id === merged.goal) ?? GOALS[0]
  const autoCalories = Math.max(1200, tdee - goalMeta.deficit)
  const autoProtein  = Math.round((merged.current_weight_kg ?? 85) * 2)
  const autoCarbs    = Math.round((autoCalories - autoProtein * 4 - (merged.target_fat_g ?? 65) * 9) / 4)
  const autoFat      = merged.target_fat_g ?? 65

  const pace = merged.current_weight_kg && merged.target_weight_kg ? calculateWeightLossPace(merged) : null

  const set = (k: keyof NutritionProfile, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      ...(customize ? {} : {
        target_calories: autoCalories,
        target_protein_g: autoProtein,
        target_carbs_g: Math.max(0, autoCarbs),
        target_fat_g: autoFat,
      }),
    }
    const res = await fetch('/api/nutrition/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) { const d = await res.json(); setProfile(d.profile); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-inset)',
    border: '1px solid var(--edge)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--ink)',
    fontSize: 13,
    width: '100%',
  }

  if (loading) return (
    <div style={{ padding: 24, color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center' }}>
      {L('A carregar...', 'Loading...')}
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '16px 16px 80px' : 24, maxWidth: 600, margin: '0 auto' }}>

      {/* ── Current stats ── */}
      <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>
          {L('Dados Atuais', 'Current Stats')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L('Peso atual (kg)', 'Current weight (kg)')}</label>
            <input type="number" step="0.1" style={inputStyle} value={form.current_weight_kg ?? ''} onChange={e => set('current_weight_kg', parseFloat(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L('Altura (cm)', 'Height (cm)')}</label>
            <input type="number" style={inputStyle} value={form.height_cm ?? ''} onChange={e => set('height_cm', parseInt(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L('Idade', 'Age')}</label>
            <input type="number" style={inputStyle} value={form.age ?? ''} onChange={e => set('age', parseInt(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L('Sexo', 'Sex')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['male', 'female'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => set('sex', s)}
                  style={{
                    flex: 1,
                    padding: '9px 8px',
                    borderRadius: 8,
                    border: `1px solid ${form.sex === s ? 'var(--c-cal)' : 'var(--edge)'}`,
                    background: form.sex === s ? 'var(--c-cal-dim)' : 'var(--bg-inset)',
                    color: form.sex === s ? 'var(--c-cal)' : 'var(--ink-dim)',
                    fontSize: 12.5,
                    cursor: 'pointer',
                    fontWeight: form.sex === s ? 600 : 400,
                  }}
                >
                  {s === 'male' ? L('Masculino', 'Male') : L('Feminino', 'Female')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 8 }}>{L('Nível de Atividade', 'Activity Level')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.id}
                onClick={() => set('activity_level', a.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: `1px solid ${form.activity_level === a.id ? 'var(--c-cal)' : 'var(--edge)'}`,
                  background: form.activity_level === a.id ? 'var(--c-cal-dim)' : 'var(--bg-inset)',
                  color: form.activity_level === a.id ? 'var(--c-cal)' : 'var(--ink-dim)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: form.activity_level === a.id ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <span>{L(a.label_pt, a.label_en)}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{L(a.desc_pt, a.desc_en)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Goal section ── */}
      <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>
          {L('Objetivo', 'Goal')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          {GOALS.map(g => {
            const isActive = form.goal === g.id
            return (
              <button
                key={g.id}
                onClick={() => set('goal', g.id)}
                style={{
                  padding: '14px 10px',
                  borderRadius: 10,
                  border: `1px solid ${isActive ? 'var(--c-cal)' : 'var(--edge)'}`,
                  background: isActive ? 'var(--c-cal-dim)' : 'var(--bg-inset)',
                  color: isActive ? 'var(--c-cal)' : 'var(--ink-dim)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{g.emoji}</div>
                {L(g.label_pt, g.label_en)}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L('Peso alvo (kg)', 'Target weight (kg)')}</label>
            <input type="number" step="0.5" style={inputStyle} value={form.target_weight_kg ?? ''} onChange={e => set('target_weight_kg', parseFloat(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L('Data alvo', 'Target date')}</label>
            <input type="date" style={inputStyle} value={form.target_date ?? ''} onChange={e => set('target_date', e.target.value)} />
          </div>
        </div>

        {pace && pace.weeklyLossKg !== 0 && (
          <div style={{ marginTop: 14, background: 'var(--bg-inset)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: pace.onTrack ? 'var(--pos)' : 'var(--c-fin)' }}>
            {L(
              `Estimativa: ${pace.weeklyLossKg}kg/semana · ${pace.weeksToGoal} semanas para atingir o objetivo`,
              `Estimate: ${pace.weeklyLossKg}kg/week · ${pace.weeksToGoal} weeks to reach goal`,
            )}
          </div>
        )}
      </section>

      {/* ── Calculated targets ── */}
      <section style={{ background: 'var(--bg-raised)', border: '1px solid var(--edge-soft)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            {L('Objetivos Nutricionais', 'Nutritional Targets')}
          </div>
          <button
            className="btn"
            onClick={() => setCustomize(v => !v)}
            style={{ fontSize: 12, padding: '5px 10px', color: customize ? 'var(--c-cal)' : undefined }}
          >
            {L('Personalizar', 'Customize')}
          </button>
        </div>

        {tdee > 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 14 }}>
            {L(`TDEE calculado: ${tdee} kcal/dia`, `Calculated TDEE: ${tdee} kcal/day`)}
          </div>
        )}

        {customize ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { key: 'target_calories',  label_pt: 'Calorias (kcal)', label_en: 'Calories (kcal)' },
              { key: 'target_protein_g', label_pt: 'Proteína (g)',     label_en: 'Protein (g)'     },
              { key: 'target_carbs_g',   label_pt: 'Hidratos (g)',     label_en: 'Carbs (g)'       },
              { key: 'target_fat_g',     label_pt: 'Gordura (g)',      label_en: 'Fat (g)'         },
              { key: 'target_water_ml',  label_pt: 'Água (ml)',        label_en: 'Water (ml)'      },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)', marginBottom: 5 }}>{L(f.label_pt, f.label_en)}</label>
                <input type="number" style={inputStyle} value={form[f.key as keyof NutritionProfile] as number ?? ''} onChange={e => set(f.key as keyof NutritionProfile, parseInt(e.target.value))} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'kcal', value: autoCalories, color: 'var(--c-cal)' },
              { label: L('Prot', 'Prot'), value: `${autoProtein}g`, color: 'var(--c-health)' },
              { label: L('Hidr', 'Carbs'), value: `${Math.max(0, autoCarbs)}g`, color: 'var(--c-fin)' },
              { label: L('Gord', 'Fat'), value: `${autoFat}g`, color: 'var(--c-task)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-inset)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        className="btn btn-accent"
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: 14, fontSize: 14, '--accent': 'var(--c-cal)' } as React.CSSProperties}
      >
        {saved ? L('✓ Guardado', '✓ Saved') : saving ? L('A guardar...', 'Saving...') : L('Guardar Objetivos', 'Save Goals')}
      </button>
    </div>
  )
}

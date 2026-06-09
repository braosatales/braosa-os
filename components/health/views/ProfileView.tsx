'use client'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui'
import { L } from '@/lib/i18n'
import {
  GOAL_META, EQUIPMENT_META, DAY_META,
  type WorkoutGoal, type Equipment, type ExperienceLevel, type DayOfWeek,
} from '@/lib/health'

const GOALS: WorkoutGoal[] = ['build_muscle', 'lose_fat', 'improve_endurance', 'stay_active', 'athlete_performance']
const EQUIPMENTS: Equipment[] = ['none', 'dumbbells', 'barbell_rack', 'full_gym', 'rings', 'kettlebells', 'cardio_machines']
const DAYS: DayOfWeek[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const DURATIONS = [30, 45, 60, 75, 90]
const EXPERIENCE_LEVELS: { id: ExperienceLevel; label_pt: string; label_en: string }[] = [
  { id: 'beginner',     label_pt: 'Iniciante',     label_en: 'Beginner'     },
  { id: 'intermediate', label_pt: 'Intermédio',    label_en: 'Intermediate' },
  { id: 'advanced',     label_pt: 'Avançado',      label_en: 'Advanced'     },
]

const accent = 'var(--c-health)'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.18em',
      color: 'var(--ink-faint)',
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

export default function ProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  const [goal, setGoal] = useState<WorkoutGoal>('build_muscle')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>([])
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [sessionDuration, setSessionDuration] = useState(60)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate')
  const [injuries, setInjuries] = useState('')
  const [fitnessNotes, setFitnessNotes] = useState('')

  useEffect(() => {
    fetch('/api/health/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setHasProfile(true)
          setGoal(d.profile.goal)
          setEquipment(d.profile.equipment ?? [])
          setAvailableDays(d.profile.available_days ?? [])
          setSessionsPerWeek(d.profile.sessions_per_week ?? 3)
          setSessionDuration(d.profile.session_duration ?? 60)
          setExperienceLevel(d.profile.experience_level ?? 'intermediate')
          setInjuries(d.profile.injuries ?? '')
          setFitnessNotes(d.profile.fitness_notes ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleEquipment(e: Equipment) {
    setEquipment(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  function toggleDay(d: DayOfWeek) {
    setAvailableDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    const body = { goal, equipment, available_days: availableDays, sessions_per_week: sessionsPerWeek, session_duration: sessionDuration, experience_level: experienceLevel, injuries, fitness_notes: fitnessNotes }
    const method = hasProfile ? 'PATCH' : 'POST'
    await fetch('/api/health/profile', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    onNavigate('journey')
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--ink-faint)' }}>
          {L('A carregar…', 'Loading…')}
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ overflowY: 'auto', padding: '32px 24px', maxWidth: 640, margin: '0 auto', width: '100%' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {hasProfile ? L('Editar Perfil', 'Edit Profile') : L('Configurar Perfil de Treino', 'Set Up Workout Profile')}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.05em' }}>
          {hasProfile
            ? L('Atualiza as tuas preferências de treino.', 'Update your workout preferences.')
            : L('Diz-nos sobre os teus objetivos para personalizarmos o teu plano.', 'Tell us about your goals so we can personalize your plan.')}
        </div>
      </div>

      {/* Goal */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>{L('OBJETIVO', 'GOAL')}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {GOALS.map((g, i) => {
            const meta = GOAL_META[g]
            const isActive = goal === g
            const isLast = i === GOALS.length - 1
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                style={{
                  gridColumn: isLast ? 'span 2' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: isActive ? `1.5px solid ${accent}` : '1.5px solid var(--edge-soft)',
                  background: isActive ? `color-mix(in oklch, ${accent} 10%, var(--bg-raised))` : 'var(--bg-raised)',
                  color: isActive ? accent : 'var(--ink-dim)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0 }}>
                  <Icon name={meta.icon as Parameters<typeof Icon>[0]['name']} size={16} />
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? accent : 'var(--ink)' }}>
                    {L(meta.label_pt, meta.label_en)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>
                    {L(meta.description_pt, meta.description_en)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Equipment */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>{L('EQUIPAMENTO', 'EQUIPMENT')}</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EQUIPMENTS.map((e) => {
            const meta = EQUIPMENT_META[e]
            const isActive = equipment.includes(e)
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggleEquipment(e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 20,
                  border: isActive ? `1.5px solid ${accent}` : '1.5px solid var(--edge-soft)',
                  background: isActive ? `color-mix(in oklch, ${accent} 12%, var(--bg-raised))` : 'var(--bg-raised)',
                  color: isActive ? accent : 'var(--ink-dim)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <Icon name={meta.icon as Parameters<typeof Icon>[0]['name']} size={13} />
                {L(meta.label_pt, meta.label_en)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Available days */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>{L('DIAS DISPONÍVEIS', 'AVAILABLE DAYS')}</SectionLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAYS.map((d) => {
            const meta = DAY_META[d]
            const isActive = availableDays.includes(d)
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: isActive ? `1.5px solid ${accent}` : '1.5px solid var(--edge-soft)',
                  background: isActive ? `color-mix(in oklch, ${accent} 12%, var(--bg-raised))` : 'var(--bg-raised)',
                  color: isActive ? accent : 'var(--ink-dim)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all .15s',
                }}
              >
                {L(meta.label_pt, meta.label_en)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sessions per week + Duration */}
      <div style={{ marginBottom: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <SectionLabel>{L('SESSÕES/SEMANA', 'SESSIONS/WEEK')}</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setSessionsPerWeek(Math.max(1, sessionsPerWeek - 1))}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--edge-soft)',
                background: 'var(--bg-raised)', color: 'var(--ink-dim)', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: accent, minWidth: 24, textAlign: 'center' }}>
              {sessionsPerWeek}
            </span>
            <button
              type="button"
              onClick={() => setSessionsPerWeek(Math.min(7, sessionsPerWeek + 1))}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--edge-soft)',
                background: 'var(--bg-raised)', color: 'var(--ink-dim)', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>
        </div>
        <div>
          <SectionLabel>{L('DURAÇÃO (MIN)', 'DURATION (MIN)')}</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DURATIONS.map((d) => {
              const isActive = sessionDuration === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSessionDuration(d)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: isActive ? `1.5px solid ${accent}` : '1.5px solid var(--edge-soft)',
                    background: isActive ? `color-mix(in oklch, ${accent} 12%, var(--bg-raised))` : 'var(--bg-raised)',
                    color: isActive ? accent : 'var(--ink-dim)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Experience level */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>{L('NÍVEL DE EXPERIÊNCIA', 'EXPERIENCE LEVEL')}</SectionLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {EXPERIENCE_LEVELS.map((lvl) => {
            const isActive = experienceLevel === lvl.id
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setExperienceLevel(lvl.id)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: isActive ? `1.5px solid ${accent}` : '1.5px solid var(--edge-soft)',
                  background: isActive ? `color-mix(in oklch, ${accent} 10%, var(--bg-raised))` : 'var(--bg-raised)',
                  color: isActive ? accent : 'var(--ink-dim)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all .15s',
                }}
              >
                {L(lvl.label_pt, lvl.label_en)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Optional: injuries */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{L('LESÕES / LIMITAÇÕES (OPCIONAL)', 'INJURIES / LIMITATIONS (OPTIONAL)')}</SectionLabel>
        <textarea
          value={injuries}
          onChange={e => setInjuries(e.target.value)}
          rows={2}
          placeholder={L('Ex: dores no joelho direito…', 'E.g. right knee pain…')}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1.5px solid var(--edge-soft)',
            background: 'var(--bg-raised)',
            color: 'var(--ink)',
            fontSize: 13,
            resize: 'vertical',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Optional: fitness notes */}
      <div style={{ marginBottom: 32 }}>
        <SectionLabel>{L('NOTAS ADICIONAIS (OPCIONAL)', 'ADDITIONAL NOTES (OPTIONAL)')}</SectionLabel>
        <textarea
          value={fitnessNotes}
          onChange={e => setFitnessNotes(e.target.value)}
          rows={2}
          placeholder={L('Ex: prefiro treinar cedo de manhã…', 'E.g. I prefer training early morning…')}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1.5px solid var(--edge-soft)',
            background: 'var(--bg-raised)',
            color: 'var(--ink)',
            fontSize: 13,
            resize: 'vertical',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        style={{
          width: '100%',
          padding: '13px 20px',
          borderRadius: 10,
          border: 'none',
          background: accent,
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
          transition: 'opacity .15s',
          fontFamily: 'var(--font-display)',
        }}
      >
        {saving
          ? L('A guardar…', 'Saving…')
          : hasProfile
            ? L('Guardar Alterações', 'Save Changes')
            : L('Criar Perfil', 'Create Profile')}
      </button>
    </form>
  )
}

"use client"

import { Icon } from "@/components/ui"

interface EmptyDashboardProps {
  device: 'desktop' | 'mobile'
  onAddWidget: () => void
}

export default function EmptyDashboard({ device, onAddWidget }: EmptyDashboardProps) {
  if (device === 'mobile') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '40px 24px',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <span style={{ color: 'var(--ink-faint)', display: 'flex' }}><Icon name="grid" size={36} /></span>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Your dashboard is empty
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.4 }}>
          Add widgets to get started
        </div>
        <button
          className="btn-accent"
          onClick={onAddWidget}
          style={{
            width: '100%',
            height: 56,
            fontSize: 15,
            fontWeight: 600,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 'var(--radius)',
          }}
        >
          + Add First Widget
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 16,
        padding: 40,
        textAlign: 'center',
      }}
    >
      <span style={{ color: 'var(--ink-faint)', display: 'flex' }}><Icon name="grid" size={48} /></span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
        Your dashboard is empty
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
        Add widgets to get started
      </div>
      <button
        className="btn-accent"
        onClick={onAddWidget}
        style={{
          padding: '12px 28px',
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 'var(--radius)',
        }}
      >
        + Add First Widget
      </button>
    </div>
  )
}

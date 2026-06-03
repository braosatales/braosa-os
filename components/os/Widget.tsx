'use client'

import type { CSSProperties, ReactNode, PointerEvent } from 'react'
import Icon from './Icon'

interface WidgetProps {
  title: string
  color: string
  glyph: string
  synced?: string
  lifted?: boolean
  dragging?: boolean
  onHandleDown?: (e: PointerEvent) => void
  onResizeDown?: (e: PointerEvent) => void
  onRemove?: () => void
  children?: ReactNode
  style?: CSSProperties
}

export default function Widget({
  title, color, glyph, synced, lifted, dragging,
  onHandleDown, onResizeDown, onRemove, children, style,
}: WidgetProps) {
  const cls = [
    'widget',
    lifted ? 'widget-lifted' : '',
    dragging ? 'widget-dragging' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      style={{
        position: 'relative', height: '100%',
        background: 'var(--bg-raised)',
        border: '1px solid var(--edge)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color .18s ease, box-shadow .18s ease, transform .12s ease',
        '--accent': color,
        ...style,
      } as CSSProperties}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color }}><Icon name={glyph} size={15} stroke={1.8} /></span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)',
            letterSpacing: '0.02em',
          }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {synced && (
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{synced}</span>
          )}
          <button
            className="drag-handle"
            onPointerDown={onHandleDown}
            style={{
              background: 'none', border: 'none', padding: 3, cursor: 'grab',
              color: 'var(--ink-faint)', display: 'flex', alignItems: 'center',
            }}
            aria-label="Drag"
          >
            <Icon name="drag" size={14} stroke={2} />
          </button>
          <button
            className="widget-x"
            onClick={onRemove}
            style={{
              background: 'none', border: 'none', padding: 3, cursor: 'pointer',
              color: 'var(--ink-faint)', display: 'flex', alignItems: 'center',
              opacity: 0, transition: 'opacity .15s, color .15s, transform .15s',
            }}
            aria-label="Remove widget"
          >
            <Icon name="close" size={13} stroke={2} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0 16px 14px', flex: 1, overflow: 'hidden' }}>
        {children}
      </div>

      {/* Resize grip */}
      <button
        className="resize-grip"
        onPointerDown={onResizeDown}
        style={{
          position: 'absolute', right: 5, bottom: 5,
          background: 'none', border: 'none', padding: 4,
          cursor: 'se-resize', color: 'var(--ink-faint)',
          display: 'flex', alignItems: 'center',
          lineHeight: 1, fontSize: 14,
        }}
        aria-label="Resize"
      >
        ⌟
      </button>
    </div>
  )
}

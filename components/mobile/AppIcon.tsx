import React from 'react'

export function AppIcon({
  appId: _appId,
  color,
  size = 60,
  children,
}: {
  appId: string
  color: string
  size?: number
  children: React.ReactNode
}) {
  const r = Math.round(size * 0.267)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: `linear-gradient(145deg, color-mix(in oklch, ${color} 35%, var(--bg-raised-2, var(--bg-raised))), color-mix(in oklch, ${color} 20%, var(--bg-void, var(--bg))))`,
        border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
        boxShadow: `inset 0 1px 0 oklch(1 0 0 / 0.15), 0 4px 20px -4px oklch(0 0 0 / 0.6), 0 0 20px -4px color-mix(in oklch, ${color} 40%, transparent)`,
        display: 'grid',
        placeItems: 'center',
        backdropFilter: 'blur(2px)',
        flexShrink: 0,
      }}
    >
      <div style={{ width: size * 0.45, height: size * 0.45, display: 'grid', placeItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}

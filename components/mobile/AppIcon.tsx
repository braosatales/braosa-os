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
        background: `linear-gradient(145deg, ${color}38, ${color}18)`,
        border: `1px solid ${color}55`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 20px -4px rgba(0,0,0,0.6), 0 0 20px -4px ${color}66`,
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

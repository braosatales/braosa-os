'use client'

interface RingProps {
  value: number
  color: string
  size?: number
  stroke?: number
  label?: string
}

export default function Ring({ value, color, size = 44, stroke = 4, label }: RingProps) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const dash = pct * circ
  const gap = circ - dash
  const center = size / 2
  const text = label ?? `${Math.round(pct * 100)}%`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke="var(--edge-soft)"
        strokeWidth={stroke}
      />
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text
        x={center} y={center}
        dominantBaseline="middle"
        textAnchor="middle"
        fill="var(--ink-soft)"
        fontSize={size * 0.22}
        fontWeight={600}
        style={{ fontFamily: 'var(--mono)' }}
      >
        {text}
      </text>
    </svg>
  )
}

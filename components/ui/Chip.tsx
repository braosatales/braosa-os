'use client';

import Icon from './Icon';

type ChipProps = {
  label: string;
  color?: string;
  onRemove?: () => void;
  onClick?: () => void;
};

export default function Chip({ label, color, onRemove, onClick }: ChipProps) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1,
        background: color
          ? `color-mix(in oklab, ${color} 12%, transparent)`
          : 'var(--bg-raised-2)',
        color: color ?? 'var(--ink-soft)',
        border: `1px solid ${color ? `color-mix(in oklab, ${color} 22%, transparent)` : 'var(--edge-soft)'}`,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            color: 'inherit',
            opacity: 0.65,
            marginLeft: 1,
          }}
        >
          <Icon name="close" size={10} stroke={2.5} />
        </button>
      )}
    </span>
  );
}

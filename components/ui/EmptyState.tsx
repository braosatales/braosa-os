'use client';

import Icon from './Icon';
import type { IconName } from '@/lib/icons';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
};

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius)',
          background: 'var(--bg-raised-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-faint)',
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
            {subtitle}
          </span>
        )}
      </div>
      {action && (
        <button className="btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

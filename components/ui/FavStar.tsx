'use client';

import Icon from './Icon';

type FavStarProps = {
  on: boolean;
  onClick: () => void;
  size?: number;
};

export default function FavStar({ on, onClick, size = 16 }: FavStarProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: on ? 'var(--c-fin)' : 'var(--ink-faint)',
        transition: 'color .15s ease',
      }}
    >
      <Icon name={on ? 'star-fill' : 'star'} size={size} />
    </button>
  );
}

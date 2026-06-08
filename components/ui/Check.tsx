'use client';

type CheckProps = {
  done: boolean;
  onToggle: () => void;
  color?: string;
};

export default function Check({ done, onToggle, color = 'var(--pos)' }: CheckProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={onToggle}
      style={{
        width: 19,
        height: 19,
        borderRadius: 5,
        border: `1.5px solid ${done ? color : 'var(--edge-strong)'}`,
        background: done ? color : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'border-color .15s ease, background .15s ease',
      }}
    >
      {done && (
        <svg width={11} height={9} viewBox="0 0 11 9" fill="none">
          <path
            d="M1.5 4.5L4 7L9.5 1.5"
            stroke="oklch(0.18 0.01 80)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

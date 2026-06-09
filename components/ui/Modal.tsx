'use client';

import { useEffect, useCallback } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
};

export default function Modal({ open, onClose, children, width = 520 }: ModalProps) {
  const isMobile = useIsMobile();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  const cardStyle = isMobile ? {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    paddingBottom: 'env(safe-area-inset-bottom)',
    background: 'var(--bg-raised)',
    border: '1px solid var(--edge)',
    boxShadow: 'var(--shadow-pop)',
    animation: 'slideUp .28s cubic-bezier(.2,.8,.2,1) both',
  } : {
    background: 'var(--bg-raised)',
    border: '1px solid var(--edge)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-pop)',
    width: '100%',
    maxWidth: width,
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    animation: 'pop-in .22s ease both',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        background: 'oklch(0 0 0 / 0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={cardStyle}
      >
        {isMobile && (
          <span style={{
            width: 36,
            height: 4,
            borderRadius: 99,
            background: 'var(--edge)',
            margin: '12px auto 0',
            display: 'block',
          }} />
        )}
        {children}
      </div>
    </div>
  );
}

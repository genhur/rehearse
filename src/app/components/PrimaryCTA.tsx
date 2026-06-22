import { ReactNode } from 'react';

interface PrimaryCTAProps {
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
}

/** Quiet translucent pill — the only persistent control on calm screens. */
export function PrimaryCTA({ onClick, children, icon }: PrimaryCTAProps) {
  return (
    <button
      onClick={onClick}
      className="w-full font-body flex items-center justify-center gap-2"
      style={{
        padding: '17px 24px',
        fontSize: 16,
        fontWeight: 500,
        color: 'var(--r-cta-text)',
        background: 'var(--r-cta-bg)',
        border: '1px solid var(--r-cta-border)',
        borderRadius: 9999,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        letterSpacing: '-0.01em',
        boxShadow: '0 1px 2px rgba(2, 30, 59, 0.04)',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

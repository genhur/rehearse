import { ReactNode } from 'react';

interface PrimaryCTAProps {
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
}

export function PrimaryCTA({ onClick, children, icon }: PrimaryCTAProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-r-cta-bg text-r-cta-text font-geist font-medium flex items-center justify-center gap-2 uppercase"
      style={{
        padding: '20px 16px 20px 12px',
        fontSize: 16,
        letterSpacing: '0.64px',
        borderRadius: 40,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

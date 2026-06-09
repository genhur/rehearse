import { ReactNode } from 'react';

interface HeroHeadingProps {
  children: ReactNode;
}

export function HeroHeading({ children }: HeroHeadingProps) {
  return (
    <h1
      className="font-display text-r-text-primary"
      style={{
        fontSize: 48,
        fontWeight: 600,
        lineHeight: 1.18,
        letterSpacing: '-0.03px',
      }}
    >
      {children}
    </h1>
  );
}

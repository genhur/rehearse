import { ReactNode } from 'react';

interface HeroHeadingProps {
  children: ReactNode;
}

export function HeroHeading({ children }: HeroHeadingProps) {
  return (
    <h1
      className="font-display text-r-text-primary"
      style={{
        fontSize: 56,
        fontWeight: 600,
        lineHeight: 0.96,
        letterSpacing: '-0.03em',
      }}
    >
      {children}
    </h1>
  );
}

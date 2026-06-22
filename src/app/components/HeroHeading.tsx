import { ReactNode, CSSProperties } from 'react';

interface HeroHeadingProps {
  children: ReactNode;
  align?: 'left' | 'center';
  size?: number;
  style?: CSSProperties;
}

/** Ivar Text headline — editorial, regular weight, tight leading. */
export function HeroHeading({ children, align = 'left', size = 40, style }: HeroHeadingProps) {
  return (
    <h1
      className="font-display text-r-text-primary"
      style={{
        fontSize: size,
        fontWeight: 400,
        lineHeight: 1.06,
        letterSpacing: '-0.018em',
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </h1>
  );
}

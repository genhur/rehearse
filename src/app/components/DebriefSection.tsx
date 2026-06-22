import { ReactNode } from 'react';

interface DebriefSectionProps {
  title: string;
  children: ReactNode;
}

/** Editorial debrief block — Founders Grotesk heading over Ivar Text body. No cards, no color. */
export function DebriefSection({ title, children }: DebriefSectionProps) {
  return (
    <section style={{ marginBottom: 34 }}>
      <h2
        className="font-body text-r-text-primary"
        style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.01em' }}
      >
        {title}
      </h2>
      <div
        className="font-display text-r-text-primary"
        style={{ fontSize: 19, lineHeight: 1.5, letterSpacing: '-0.01em' }}
      >
        {children}
      </div>
    </section>
  );
}

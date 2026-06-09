import { ReactNode } from 'react';

interface DebriefSectionProps {
  title: string;
  children: ReactNode;
}

export function DebriefSection({ title, children }: DebriefSectionProps) {
  return (
    <section className="py-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <h2
        className="font-display text-r-text-primary mb-4"
        style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}
      >
        {title}
      </h2>
      <div className="font-body text-r-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
        {children}
      </div>
    </section>
  );
}

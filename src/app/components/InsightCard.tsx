interface InsightCardProps {
  title: string;
  description: string;
  accentColor?: string;
}

export function InsightCard({
  title,
  description,
  accentColor = 'var(--r-accent-purple)',
}: InsightCardProps) {
  return (
    <div
      className="bg-r-surface p-5"
      style={{
        borderRadius: 'var(--r-radius-lg)',
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <h3
        className="font-geist font-medium text-r-text-primary mb-2"
        style={{ fontSize: 14 }}
      >
        {title}
      </h3>
      <p
        className="font-geist text-r-text-secondary"
        style={{ fontSize: 14, lineHeight: 1.6 }}
      >
        {description}
      </p>
    </div>
  );
}

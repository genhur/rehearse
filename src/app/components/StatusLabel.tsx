interface StatusLabelProps {
  children: string;
}

/** Quiet state line (e.g. "Call ended.") — Founders Grotesk, muted navy. */
export function StatusLabel({ children }: StatusLabelProps) {
  return (
    <span
      className="font-body text-r-text-secondary block text-center"
      style={{
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </span>
  );
}

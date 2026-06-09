interface StatusLabelProps {
  children: string;
}

export function StatusLabel({ children }: StatusLabelProps) {
  return (
    <span
      className="font-geist text-r-text-secondary uppercase block text-center"
      style={{
        fontSize: 16,
        fontWeight: 300,
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </span>
  );
}

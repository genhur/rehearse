interface EndCallButtonProps {
  onClick?: () => void;
}

/** End the session — a quiet translucent circle with a close mark, centered at the foot. */
export function EndCallButton({ onClick }: EndCallButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center transition-opacity hover:opacity-80"
      style={{
        width: 64,
        height: 64,
        borderRadius: 9999,
        background: 'rgba(255, 255, 255, 0.32)',
        border: '1px solid rgba(2, 30, 59, 0.18)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      aria-label="End session"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--r-ink)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    </button>
  );
}

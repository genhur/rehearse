import { EndCallIcon } from './EndCallIcon';

interface EndCallButtonProps {
  onClick?: () => void;
}

export function EndCallButton({ onClick }: EndCallButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center text-r-text-primary"
      style={{
        width: 80,
        height: 80,
        borderRadius: 9999,
        backgroundColor: '#262626',
      }}
      aria-label="End call"
    >
      <EndCallIcon size={34} />
    </button>
  );
}

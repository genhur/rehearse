import { PhoneOff } from 'lucide-react';

interface EndCallButtonProps {
  onClick?: () => void;
}

export function EndCallButton({ onClick }: EndCallButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        width: 56,
        height: 56,
        borderRadius: 9999,
        backgroundColor: '#ef4444',
      }}
      aria-label="End call"
    >
      <PhoneOff size={24} color="white" />
    </button>
  );
}

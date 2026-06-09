import { Mail } from 'lucide-react';

interface ViewFeedbackButtonProps {
  onClick?: () => void;
}

export function ViewFeedbackButton({ onClick }: ViewFeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-r-cta-bg text-r-cta-text font-geist flex items-center justify-center gap-2 uppercase"
      style={{
        padding: '20px 16px 20px 12px',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.06em',
        borderRadius: 40,
      }}
    >
      <Mail size={20} />
      View feedback
    </button>
  );
}

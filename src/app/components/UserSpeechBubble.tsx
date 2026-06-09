interface UserSpeechBubbleProps {
  children: string;
}

export function UserSpeechBubble({ children }: UserSpeechBubbleProps) {
  return (
    <div className="flex justify-end">
      <div
        className="font-geist text-r-text-primary"
        style={{
          backgroundColor: 'var(--r-user-bubble)',
          padding: '12px 16px',
          borderRadius: '20px 20px 4px 20px',
          maxWidth: '80%',
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {children}
      </div>
    </div>
  );
}

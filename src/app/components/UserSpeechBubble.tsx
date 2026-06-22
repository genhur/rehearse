interface UserSpeechBubbleProps {
  children: string;
}

/** The user's own lines — right-aligned Ivar Text, no bubble, same voice as the script. */
export function UserSpeechBubble({ children }: UserSpeechBubbleProps) {
  return (
    <div className="flex justify-end">
      <p
        className="font-display text-r-text-primary text-right"
        style={{
          maxWidth: '88%',
          fontSize: 21,
          lineHeight: 1.42,
          letterSpacing: '-0.01em',
        }}
      >
        {children}
      </p>
    </div>
  );
}

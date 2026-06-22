interface TranscriptMessageProps {
  content: string;
  timestamp?: string;
}

/** AI / partner line — reads like dialogue in a script. Ivar Text, left-aligned. */
export function TranscriptMessage({ content, timestamp }: TranscriptMessageProps) {
  return (
    <div className="flex justify-start">
      <div style={{ maxWidth: '88%' }}>
        <p
          className="font-display text-r-text-primary"
          style={{ fontSize: 21, lineHeight: 1.42, letterSpacing: '-0.01em' }}
        >
          {content}
        </p>
        {timestamp && (
          <span className="block mt-1 text-r-text-tertiary font-body" style={{ fontSize: 12 }}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

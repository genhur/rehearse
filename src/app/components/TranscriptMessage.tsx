interface TranscriptMessageProps {
  content: string;
  timestamp?: string;
}

export function TranscriptMessage({ content, timestamp }: TranscriptMessageProps) {
  return (
    <div className="flex justify-start">
      <div>
        <p
          className="font-body text-r-text-primary"
          style={{ fontSize: 14, lineHeight: 1.55 }}
        >
          {content}
        </p>
        {timestamp && (
          <span className="block mt-1 text-r-text-secondary" style={{ fontSize: 12 }}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

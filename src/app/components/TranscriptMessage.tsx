interface TranscriptMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function TranscriptMessage({ role, content, timestamp }: TranscriptMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 font-geist ${
          isUser
            ? 'bg-r-accent-purple text-white'
            : 'bg-r-surface text-r-text-primary'
        }`}
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        }}
      >
        <p>{content}</p>
        {timestamp && (
          <span className="block mt-1 text-r-text-secondary" style={{ fontSize: 12 }}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

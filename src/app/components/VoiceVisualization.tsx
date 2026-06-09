const BARS = [
  { color: 'var(--r-accent-green)', left: 0, top: 33, height: 116 },
  { color: 'var(--r-accent-purple)', left: 35, top: 62, height: 64 },
  { color: 'var(--r-accent-blue)', left: 70, top: 91, height: 48 },
  { color: 'var(--r-accent-blue)', left: 70, top: 149, height: 77 },
  { color: 'var(--r-accent-mint)', left: 105, top: 124, height: 164 },
  { color: 'var(--r-accent-pink)', left: 140, top: 105, height: 115 },
  { color: 'var(--r-accent-white)', left: 175, top: 40, height: 115 },
  { color: 'var(--r-accent-yellow)', left: 175, top: 165, height: 42 },
  { color: 'var(--r-accent-purple)', left: 210, top: 0, height: 120 },
  { color: 'var(--r-accent-green)', left: 245, top: 79, height: 79 },
  { color: 'var(--r-accent-blue)', left: 280, top: 42, height: 48 },
  { color: 'var(--r-accent-blue)', left: 280, top: 100, height: 77 },
  { color: 'var(--r-accent-navy)', left: 315, top: 18, height: 86 },
];

const CONTAINER_WIDTH = 331;
const CONTAINER_HEIGHT = 288;
const BAR_WIDTH = 16;

export function VoiceVisualization({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }}
    >
      {BARS.map((bar, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: bar.left,
            top: bar.top,
            width: BAR_WIDTH,
            height: bar.height,
            backgroundColor: bar.color,
            borderRadius: 40,
          }}
        />
      ))}
    </div>
  );
}

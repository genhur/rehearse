const BARS = [
  { color: 'var(--r-accent-green)', left: 0, top: 33, height: 116 },
  { color: 'var(--r-accent-purple)', left: 10.57, top: 62, height: 64 },
  { color: 'var(--r-accent-blue)', left: 21.15, top: 91, height: 48 },
  { color: 'var(--r-accent-blue)', left: 21.15, top: 149, height: 77 },
  { color: 'var(--r-accent-mint)', left: 31.72, top: 124, height: 164 },
  { color: 'var(--r-accent-pink)', left: 42.30, top: 105, height: 115 },
  { color: 'var(--r-accent-white)', left: 52.87, top: 40, height: 115 },
  { color: 'var(--r-accent-yellow)', left: 52.87, top: 165, height: 42 },
  { color: 'var(--r-accent-purple)', left: 63.44, top: 0, height: 120 },
  { color: 'var(--r-accent-green)', left: 74.02, top: 79, height: 79 },
  { color: 'var(--r-accent-blue)', left: 84.59, top: 42, height: 48 },
  { color: 'var(--r-accent-blue)', left: 84.59, top: 100, height: 77 },
  { color: 'var(--r-accent-navy)', left: 95.17, top: 18, height: 86 },
];

const CONTAINER_HEIGHT = 288;
const BAR_WIDTH = 16;

export function VoiceVisualization({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height: CONTAINER_HEIGHT }}
    >
      {BARS.map((bar, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${bar.left}%`,
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

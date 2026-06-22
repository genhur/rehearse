import { motion } from 'motion/react';

export type AmbientMood = 'warm' | 'cool';

interface Blob {
  color: string;
  /** position as % of viewport */
  top: string;
  left: string;
  /** size as vmax */
  size: number;
  opacity: number;
  /** seconds for one breath cycle */
  duration: number;
  delay: number;
  /** drift distances in px */
  dx: number;
  dy: number;
}

/**
 * Two atmospheric palettes. Warm = preparation (Home, setup). Cool = in the
 * room / reflection (simulation, debrief). The background itself is the voice
 * visualization, so motion stays slow and almost subliminal.
 */
const PALETTES: Record<AmbientMood, { base: string; blobs: Blob[] }> = {
  warm: {
    base: 'linear-gradient(180deg, #fff4e4 0%, #fef1e3 38%, #f8f1ec 72%, #f6f6f6 100%)',
    blobs: [
      { color: 'var(--grad-peach)', top: '-12%', left: '-18%', size: 70, opacity: 0.85, duration: 22, delay: 0, dx: 26, dy: 18 },
      { color: 'var(--grad-peach)', top: '-14%', left: '58%', size: 72, opacity: 0.8, duration: 26, delay: 3, dx: -30, dy: 22 },
      { color: 'var(--grad-lavender)', top: '-6%', left: '20%', size: 64, opacity: 0.7, duration: 24, delay: 1.5, dx: 18, dy: 26 },
      { color: 'var(--grad-blush)', top: '40%', left: '30%', size: 80, opacity: 0.55, duration: 28, delay: 5, dx: -22, dy: -18 },
      { color: 'var(--grad-coral)', top: '74%', left: '50%', size: 66, opacity: 0.4, duration: 25, delay: 2, dx: 16, dy: 14 },
    ],
  },
  cool: {
    base: 'linear-gradient(180deg, #f9f9f9 0%, #f1ecee 30%, #ecdfe3 58%, #ddd6f4 100%)',
    blobs: [
      { color: 'var(--grad-mauve)', top: '18%', left: '-16%', size: 72, opacity: 0.8, duration: 26, delay: 0, dx: 24, dy: 18 },
      { color: 'var(--grad-periwinkle)', top: '52%', left: '40%', size: 84, opacity: 0.7, duration: 30, delay: 4, dx: -26, dy: 20 },
      { color: 'var(--grad-lavender)', top: '6%', left: '46%', size: 60, opacity: 0.6, duration: 24, delay: 2, dx: 20, dy: 24 },
      { color: 'var(--grad-periwinkle)', top: '78%', left: '8%', size: 70, opacity: 0.65, duration: 28, delay: 6, dx: 18, dy: -16 },
      { color: 'var(--grad-blush)', top: '34%', left: '64%', size: 58, opacity: 0.4, duration: 27, delay: 1, dx: -18, dy: 18 },
    ],
  },
};

interface AmbientBackgroundProps {
  mood?: AmbientMood;
  /**
   * 0 = idle (gradients nearly still). 1 = active speaking (gentle ebb & flow).
   * Scales the drift amplitude and quickens the breath, never flashy.
   */
  intensity?: number;
}

export function AmbientBackground({ mood = 'warm', intensity = 0 }: AmbientBackgroundProps) {
  const { base, blobs } = PALETTES[mood];
  const amp = 0.35 + intensity * 0.65; // idle still drifts a touch, so it never feels frozen
  const speed = 1 - intensity * 0.4; // active = a little quicker

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: base }}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={`${mood}-${i}`}
          style={{
            position: 'absolute',
            top: b.top,
            left: b.left,
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${b.color} 0%, transparent 68%)`,
            opacity: b.opacity,
            filter: 'blur(64px)',
            willChange: 'transform',
          }}
          animate={{
            x: [0, b.dx * amp, b.dx * 0.4 * amp, 0],
            y: [0, b.dy * amp, -b.dy * 0.5 * amp, 0],
            scale: [1, 1 + 0.06 * amp, 1 - 0.03 * amp, 1],
          }}
          transition={{
            duration: b.duration * speed,
            delay: b.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* a soft paper grain of light over the top, keeps it from banding */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.35) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

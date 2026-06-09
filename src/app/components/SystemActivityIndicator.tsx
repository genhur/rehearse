import { motion } from 'motion/react';

const PILL_COLORS = ['#3E5BF2', '#234A3B', '#DDCF50'];

function BouncingPill({ color, delay }: { color: string; delay: number }) {
  return (
    <motion.div
      style={{
        width: 4,
        height: 20,
        borderRadius: 9999,
        backgroundColor: color,
      }}
      animate={{ y: [0, -8, 0] }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}

export function SystemActivityIndicator() {
  return (
    <div className="flex items-end gap-[3px]">
      {PILL_COLORS.map((color, i) => (
        <BouncingPill key={i} color={color} delay={i * 0.15} />
      ))}
    </div>
  );
}

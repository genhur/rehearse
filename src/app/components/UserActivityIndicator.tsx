import { motion } from 'motion/react';

const PILLS = [
  { color: '#EB8EF2', height: 16 },
  { color: '#234A3B', height: 24 },
  { color: '#833EF2', height: 28 },
];

const CYCLE = 2.7;

const KEYFRAMES = [
  { y: [0, -10, 0, 0, 0], times: [0, 0.11, 0.22, 0.23, 1] },
  { y: [0, 0, 0, -10, 0, 0], times: [0, 0.33, 0.34, 0.44, 0.56, 1] },
  { y: [0, 0, 0, -10, 0, 0], times: [0, 0.66, 0.67, 0.78, 0.89, 1] },
];

export function UserActivityIndicator() {
  return (
    <div className="flex items-end" style={{ gap: 0 }}>
      {PILLS.map((pill, i) => (
        <motion.div
          key={i}
          style={{
            width: 13,
            height: pill.height,
            borderRadius: 9999,
            backgroundColor: pill.color,
            marginLeft: i === 0 ? 0 : i === 2 ? 16 : 10,
          }}
          animate={{ y: KEYFRAMES[i].y }}
          transition={{
            duration: CYCLE,
            repeat: Infinity,
            ease: 'easeInOut',
            times: KEYFRAMES[i].times,
          }}
        />
      ))}
    </div>
  );
}

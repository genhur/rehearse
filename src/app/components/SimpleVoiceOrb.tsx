import { motion, AnimatePresence } from 'motion/react';

interface SimpleVoiceOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

function Ring({
  size,
  borderColor,
  animateTo,
  duration,
  delay,
}: {
  size: number;
  borderColor: string;
  animateTo: { scale: number[]; opacity: number[] };
  duration: number;
  delay?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        marginTop: -size / 2,
        marginLeft: -size / 2,
        border: `1px solid ${borderColor}`,
      }}
      animate={animateTo}
      transition={{ duration, repeat: Infinity, ease: 'easeOut', delay }}
    />
  );
}

export function SimpleVoiceOrb({ state }: SimpleVoiceOrbProps) {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';

  return (
    <div className="flex flex-col items-center">
      {/* Orb + rings container */}
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120, overflow: 'visible' }}>

        {/* Idle breathing rings */}
        <AnimatePresence>
          {state === 'idle' && (
            <motion.div
              key="idle-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Ring
                size={150}
                borderColor="rgba(20,17,13,0.06)"
                animateTo={{ scale: [1, 1.08, 1], opacity: [0.9, 0.15, 0.9] }}
                duration={5.5}
                delay={0}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listening ripple rings */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              key="listening-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {([0, 0.55] as number[]).map((delay, i) => (
                <Ring
                  key={i}
                  size={120}
                  borderColor="rgba(20,17,13,0.13)"
                  animateTo={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                  duration={1.9}
                  delay={delay}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speaking warm rings */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              key="speaking-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {([0, 0.45] as number[]).map((delay, i) => (
                <Ring
                  key={i}
                  size={120}
                  borderColor="rgba(190,148,88,0.28)"
                  animateTo={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                  duration={1.1}
                  delay={delay}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking pulse rings */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              key="thinking-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Ring
                size={120}
                borderColor="rgba(245,158,11,0.3)"
                animateTo={{ scale: [1, 1.2], opacity: [0.6, 0] }}
                duration={1.4}
                delay={0}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The orb itself */}
        <motion.div
          className="relative rounded-full"
          style={{ width: 80, height: 80, zIndex: 1, flexShrink: 0 }}
          animate={
            isListening
              ? { scale: [1, 1.045, 0.98, 1.045, 1] }
              : isSpeaking
              ? { scale: [1, 1.06, 0.97, 1.06, 1] }
              : isThinking
              ? { scale: [1, 1.035, 1] }
              : { scale: [1, 1.014, 1] }
          }
          transition={
            isListening
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : isSpeaking
              ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
              : isThinking
              ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {/* Orb body */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: isSpeaking
                ? 'radial-gradient(circle at 37% 30%, #382c1c, #0e0c0a)'
                : 'radial-gradient(circle at 37% 30%, #2e2720, #0e0c0a)',
              boxShadow:
                '0 16px 32px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.055)',
              transition: 'background 1s ease',
            }}
          />

          {/* Warmth glow */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 42% 36%, rgba(190,148,88,0.13), transparent 58%)',
            }}
            animate={
              isSpeaking
                ? { opacity: [0.55, 1.0, 0.55] }
                : isListening
                ? { opacity: [0.35, 0.7, 0.35] }
                : { opacity: [0.25, 0.5, 0.25] }
            }
            transition={
              isSpeaking
                ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            }
          />

          {/* Specular highlight */}
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 20,
              height: 10,
              top: '20%',
              left: '22%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.08), transparent)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
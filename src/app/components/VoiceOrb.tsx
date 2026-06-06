import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Conversation } from '@11labs/client';
import type { Mode, Status } from '@11labs/client';
import { AudioRecorder } from '../../../lib/audio-recorder';

const AGENT_ID = 'agent_4901ktej496kfp1a1kwj03q037ey';

type UIStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting';

interface VoiceOrbProps {
  onRecordingComplete?: (audioFile: File) => void;
  onClick?: () => void;
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

export function VoiceOrb({ onRecordingComplete, onClick }: VoiceOrbProps = {}) {
  const [uiStatus, setUiStatus] = useState<UIStatus>('idle');
  const [mode, setMode] = useState<Mode>('listening');
  const conversationRef = useRef<Conversation | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const handleClick = useCallback(async () => {
    // If custom onClick is provided (like on home page), use that instead
    if (onClick && uiStatus === 'idle') {
      onClick();
      return;
    }

    if (uiStatus === 'connecting' || uiStatus === 'disconnecting') return;

    if (uiStatus === 'connected') {
      setUiStatus('disconnecting');
      
      // Stop audio recording and get the file
      if (audioRecorderRef.current?.isRecording()) {
        try {
          const audioFile = await audioRecorderRef.current.stopRecording();
          onRecordingComplete?.(audioFile);
        } catch (error) {
          console.error('[Rehearse] Error stopping audio recording:', error);
        }
      }
      
      await conversationRef.current?.endSession();
      conversationRef.current = null;
      setUiStatus('idle');
      return;
    }

    setUiStatus('connecting');
    try {
      // Start audio recording
      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.startRecording();
      
      const conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => setUiStatus('connected'),
        onDisconnect: async () => {
          // Stop recording when conversation disconnects
          if (audioRecorderRef.current?.isRecording()) {
            try {
              const audioFile = await audioRecorderRef.current.stopRecording();
              onRecordingComplete?.(audioFile);
            } catch (error) {
              console.error('[Rehearse] Error stopping audio recording:', error);
            }
          }
          conversationRef.current = null;
          setUiStatus('idle');
        },
        onError: async (msg) => {
          console.error('[Rehearse] ElevenLabs error:', msg);
          // Stop recording on error
          if (audioRecorderRef.current?.isRecording()) {
            try {
              await audioRecorderRef.current.stopRecording();
            } catch (error) {
              console.error('[Rehearse] Error stopping audio recording:', error);
            }
          }
          conversationRef.current = null;
          setUiStatus('idle');
        },
        onModeChange: ({ mode }) => setMode(mode),
      });
      conversationRef.current = conversation;
    } catch (err) {
      console.error('[Rehearse] Failed to start session:', err);
      // Stop recording on error
      if (audioRecorderRef.current?.isRecording()) {
        try {
          await audioRecorderRef.current.stopRecording();
        } catch (error) {
          console.error('[Rehearse] Error stopping audio recording:', error);
        }
      }
      setUiStatus('idle');
    }
  }, [uiStatus, onRecordingComplete, onClick]);

  const isListening = uiStatus === 'connected' && mode === 'listening';
  const isSpeaking = uiStatus === 'connected' && mode === 'speaking';

  const label =
    uiStatus === 'idle'
      ? 'Tap to start voice rehearsal.'
      : uiStatus === 'connecting'
      ? 'Connecting…'
      : isSpeaking
      ? 'Speaking…'
      : 'Listening…';

  return (
    <div className="flex flex-col items-center">
      {/* Orb + rings container — overflow visible so rings can bleed out */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200, overflow: 'visible' }}>

        {/* Idle breathing rings */}
        <AnimatePresence>
          {uiStatus === 'idle' && (
            <motion.div
              key="idle-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Ring
                size={272}
                borderColor="rgba(20,17,13,0.06)"
                animateTo={{ scale: [1, 1.08, 1], opacity: [0.9, 0.15, 0.9] }}
                duration={5.5}
                delay={0}
              />
              <Ring
                size={320}
                borderColor="rgba(20,17,13,0.04)"
                animateTo={{ scale: [1, 1.08, 1], opacity: [0.9, 0.15, 0.9] }}
                duration={5.5}
                delay={1.8}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connecting pulse rings */}
        <AnimatePresence>
          {uiStatus === 'connecting' && (
            <motion.div
              key="connecting-rings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Ring
                size={200}
                borderColor="rgba(20,17,13,0.1)"
                animateTo={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                duration={1.4}
                delay={0}
              />
              <Ring
                size={200}
                borderColor="rgba(20,17,13,0.1)"
                animateTo={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                duration={1.4}
                delay={0.7}
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
              {([0, 0.55, 1.1] as number[]).map((delay, i) => (
                <Ring
                  key={i}
                  size={200}
                  borderColor="rgba(20,17,13,0.13)"
                  animateTo={{ scale: [1, 1.75], opacity: [0.7, 0] }}
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
                  size={200}
                  borderColor="rgba(190,148,88,0.28)"
                  animateTo={{ scale: [1, 1.55], opacity: [0.8, 0] }}
                  duration={1.1}
                  delay={delay}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The orb itself */}
        <motion.button
          onClick={handleClick}
          className="relative rounded-full focus:outline-none"
          style={{ width: 184, height: 184, zIndex: 1, flexShrink: 0 }}
          whileHover={uiStatus === 'idle' ? { scale: 1.03 } : {}}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Orb body */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: isSpeaking
                ? 'radial-gradient(circle at 37% 30%, #382c1c, #0e0c0a)'
                : 'radial-gradient(circle at 37% 30%, #2e2720, #0e0c0a)',
              boxShadow:
                '0 28px 72px rgba(0,0,0,0.13), 0 8px 24px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.055)',
              transition: 'background 1s ease',
            }}
            animate={
              uiStatus === 'connecting'
                ? { scale: [1, 1.035, 1], opacity: [0.75, 1, 0.75] }
                : isListening
                ? { scale: [1, 1.045, 0.98, 1.045, 1] }
                : isSpeaking
                ? { scale: [1, 1.06, 0.97, 1.06, 1] }
                : { scale: [1, 1.014, 1] }
            }
            transition={
              uiStatus === 'connecting'
                ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                : isListening
                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                : isSpeaking
                ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            }
          />

          {/* Warmth glow — breathes with the state */}
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
              width: 36,
              height: 18,
              top: '20%',
              left: '22%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.08), transparent)',
            }}
          />

          {/* "tap to end" hint when connected */}
          <AnimatePresence>
            {uiStatus === 'connected' && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.38 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute bottom-[22px] left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  fontSize: '0.55rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.9)',
                  whiteSpace: 'nowrap',
                }}
              >
                tap to end
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* State label */}
      <div style={{ marginTop: '1.75rem', height: '1.6rem', display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: '1rem',
              color: 'rgba(26,22,18,0.44)',
              textAlign: 'center',
            }}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

import { motion } from 'motion/react';
import { useNavigate, useOutletContext } from 'react-router';
import { createSetupConversation } from '../../../lib/sessions';
import { ScreenContainer } from '../components/ScreenContainer';
import { SessionsIcon } from '../components/SessionsIcon';
import { HeroHeading } from '../components/HeroHeading';
import { PrimaryCTA } from '../components/PrimaryCTA';

interface OutletContext {
  openHistoryPanel: () => void;
  isHistoryPanelOpen: boolean;
}

export function Home() {
  const navigate = useNavigate();
  const { openHistoryPanel } = useOutletContext<OutletContext>();

  const handleStartSession = () => {
    const setupConversation = createSetupConversation(
      'What conversation would you like to rehearse?'
    );
    navigate(`/conversation/setup/${setupConversation.id}`);
  };

  return (
    <ScreenContainer className="flex flex-col">
      {/* Quiet entry to past sessions — present but never loud */}
      <div style={{ padding: '64px 0 0 24px' }}>
        <button
          onClick={openHistoryPanel}
          className="text-r-text-tertiary transition-opacity hover:opacity-70"
          aria-label="Sessions"
        >
          <SessionsIcon size={22} />
        </button>
      </div>

      {/* Hero — centered, calm, the whole point of the screen */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroHeading align="center" size={40}>
            Practice<br />
            conversations<br />
            that matter.
          </HeroHeading>
        </motion.div>
      </div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        style={{ padding: '0 24px calc(24px + env(safe-area-inset-bottom))' }}
      >
        <PrimaryCTA onClick={handleStartSession}>Start a new session</PrimaryCTA>
      </motion.div>
    </ScreenContainer>
  );
}

import { motion } from 'motion/react';
import { useNavigate, useOutletContext } from 'react-router';
import { StartCallIcon } from '../components/StartCallIcon';
import { createSetupConversation } from '../../../lib/sessions';
import { ScreenContainer } from '../components/ScreenContainer';
import { NavigationIcon } from '../components/NavigationIcon';
import { HeroHeading } from '../components/HeroHeading';
import { VoiceVisualization } from '../components/VoiceVisualization';
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
      'What difficult conversation are you avoiding today?'
    );
    navigate(`/conversation/setup/${setupConversation.id}`);
  };

  return (
    <ScreenContainer className="flex flex-col">
      {/* Navigation */}
      <div style={{ padding: '76px 0 0 24px' }}>
        <NavigationIcon onClick={openHistoryPanel} />
      </div>

      {/* Hero Heading */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ padding: '72px 24px 0', maxWidth: 378 }}
      >
        <HeroHeading>
          Practice the conversations<br />
          that matter
        </HeroHeading>
      </motion.div>

      {/* Voice Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex items-center justify-center"
      >
        <VoiceVisualization />
      </motion.div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        style={{ padding: '0 24px 24px' }}
      >
        <PrimaryCTA
          onClick={handleStartSession}
          icon={<StartCallIcon size={20} />}
        >
          Start session
        </PrimaryCTA>
      </motion.div>
    </ScreenContainer>
  );
}

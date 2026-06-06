import { motion } from 'motion/react';
import { useNavigate, useOutletContext } from 'react-router';
import { VoiceOrb } from '../components/VoiceOrb';
import { AppHeader } from '../components/AppHeader';
import { createSession, createSetupConversation } from '../../../lib/sessions';

interface OutletContext {
  openHistoryPanel: () => void;
  isHistoryPanelOpen: boolean;
}

const examples = [
  "I need to tell my cofounder the deal fell through and runway is tight.",
  "I need to tell my partner I don't think we should keep dating.",
];

export function Home() {
  const navigate = useNavigate();
  const { openHistoryPanel } = useOutletContext<OutletContext>();

  const handleExampleClick = (example: string) => {
    console.log('EXAMPLE_CLICKED', example);
    
    // Create a setup conversation instead of a full session
    const setupConversation = createSetupConversation(example);
    console.log('SETUP_CREATED_FROM_EXAMPLE', setupConversation);
    
    // Navigate to conversation with setup ID
    const route = `/conversation/setup/${setupConversation.id}`;
    console.log('NAVIGATING_TO', route);
    navigate(route);
  };

  const handleStartNewRehearsal = () => {
    // Create a real committed session for immediate roleplay
    const session = createSession(
      'What difficult conversation are you avoiding today?'
    );
    
    // Navigate to the committed session
    navigate(`/conversation/${session.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* App Header for Home */}
      <AppHeader
        showHomeButton={false}
        showHistoryButton={true}
        onHistoryClick={openHistoryPanel}
      />

      {/* Main content */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ padding: '5rem 1.5rem' }}
      >
        {/* Subtle ambient background glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 42%, rgba(20,17,13,0.025), transparent)',
          }}
        />

      <div className="max-w-[480px] w-full flex flex-col items-center relative z-10">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
          style={{ marginBottom: '4rem' }}
        >
          <h1
            style={{
              fontSize: '2.625rem',
              lineHeight: '1.18',
              letterSpacing: '-0.026em',
              fontWeight: 450,
              color: '#1a1614',
            }}
          >
            Practice the conversations
            <br />
            that change your life.
          </h1>
          <p
            style={{
              marginTop: '1.25rem',
              fontSize: '1.0625rem',
              lineHeight: '1.55',
              color: 'rgba(26,22,18,0.48)',
            }}
          >
            Before you talk to them, talk to Rehearse.
          </p>
        </motion.div>

        {/* Voice orb — center of the experience */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.28, duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: '3.5rem' }}
        >
          <VoiceOrb onClick={handleStartNewRehearsal} />
        </motion.div>

        {/* Example scenarios — whispered thoughts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 1.1 }}
          className="flex flex-col items-center w-full"
          style={{ gap: '1.75rem' }}
        >
          {examples.map((example, i) => (
            <motion.button
              key={i}
              onClick={() => handleExampleClick(example)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.95 + i * 0.13, duration: 0.7 }}
              className="group text-center"
              whileHover={{ scale: 1.01 }}
            >
              <span
                className="italic transition-colors duration-200"
                style={{
                  fontSize: '0.9375rem',
                  lineHeight: '1.65',
                  color: 'rgba(26,22,18,0.3)',
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = 'rgba(26,22,18,0.55)')
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = 'rgba(26,22,18,0.3)')
                }
              >
                "{example}"
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
    </div>
  );
}

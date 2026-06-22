import { useState, useEffect, ReactNode } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams, useOutletContext } from 'react-router';
import { ScreenContainer } from '../components/ScreenContainer';
import { DebriefSection } from '../components/DebriefSection';
import { PrimaryCTA } from '../components/PrimaryCTA';
import { getSession, sessionManager, type RehearsalSession, type RehearsalAttempt } from '../../../lib/sessions';

interface OutletContext {
  openHistoryPanel: () => void;
}

/** Thin check mark — quiet affirmation, never a badge. */
function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--r-text-tertiary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 6 }}
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Check />
          <span
            className="font-display text-r-text-primary"
            style={{ fontSize: 19, lineHeight: 1.45, letterSpacing: '-0.01em' }}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <ScreenContainer className="flex items-center justify-center px-8">
      <p className="font-body text-r-text-secondary" style={{ fontSize: 15 }}>{children}</p>
    </ScreenContainer>
  );
}

export function Debrief() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { openHistoryPanel } = useOutletContext<OutletContext>();
  const [session, setSession] = useState<RehearsalSession | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<RehearsalAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    const sessionData = getSession(sessionId);
    if (!sessionData) {
      setError('That session is no longer available.');
      setLoading(false);
      return;
    }
    const attemptData = sessionManager.getCurrentAttempt(sessionId);
    if (!attemptData || !attemptData.feedbackReport) {
      setError('No debrief yet. Finish a conversation to see your reflection.');
      setLoading(false);
      return;
    }
    setSession(sessionData);
    setCurrentAttempt(attemptData);
    setLoading(false);
  }, [sessionId, navigate]);

  if (loading) return <Centered>Gathering your debrief…</Centered>;
  if (error || !session || !currentAttempt?.feedbackReport) {
    return <Centered>{error || 'Debrief not available.'}</Centered>;
  }

  const { feedbackReport } = currentAttempt;
  const scenarioLabel = session.characterRole
    ? `Talk with ${session.characterRole}`
    : session.scenario;

  return (
    <ScreenContainer className="flex flex-col">
      {/* Quiet scenario label */}
      <div style={{ padding: '28px 24px 0' }}>
        <button onClick={openHistoryPanel} className="text-left" aria-label="Sessions">
          <span
            className="font-body text-r-text-secondary block truncate"
            style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em' }}
          >
            {scenarioLabel}
          </span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 overflow-y-auto"
        style={{ padding: '28px 24px 40px' }}
      >
        <h1
          className="font-display text-r-text-primary"
          style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.018em', marginBottom: 36 }}
        >
          Here's your debrief.
        </h1>

        <DebriefSection title="Overall Assessment">
          {feedbackReport.overallAssessment}
        </DebriefSection>

        <DebriefSection title="How you came across">
          {feedbackReport.howYouCameAcross}
        </DebriefSection>

        <DebriefSection title="What worked">
          <CheckList items={feedbackReport.whatWorked} />
        </DebriefSection>

        <DebriefSection title="Opportunities">
          <CheckList items={feedbackReport.opportunities} />
        </DebriefSection>
      </motion.div>

      {/* Run it again */}
      <div style={{ padding: '0 24px calc(24px + env(safe-area-inset-bottom))' }}>
        <PrimaryCTA onClick={() => navigate(`/conversation/${sessionId}`)}>
          Run it again?
        </PrimaryCTA>
      </div>
    </ScreenContainer>
  );
}

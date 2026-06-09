import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Button } from './Button';
import { X, ExternalLink, Play, Mic } from 'lucide-react';
import type { FeedbackReport, AudioAnalysis } from '../../../lib/sessions';

interface FeedbackRailProps {
  report: FeedbackReport;
  audioAnalysis?: AudioAnalysis;
  isOpen: boolean;
  onClose: () => void;
  onJumpToMoment?: (turnId: string) => void;
  onRunAgain?: () => void;
}

export function FeedbackRail({
  report,
  audioAnalysis,
  isOpen,
  onClose,
  onJumpToMoment,
  onRunAgain,
}: FeedbackRailProps) {
  const feedbackRailRef = useRef<HTMLDivElement>(null);
  
  // Reset scroll position when rail opens
  useEffect(() => {
    if (isOpen && feedbackRailRef.current) {
      // Use a small delay to ensure the rail has fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          feedbackRailRef.current?.scrollTo({ top: 0, behavior: 'instant' });
        });
      });
    }
  }, [isOpen]);

  const handleJumpToMoment = () => {
    if (report.replayMoment.turnId && onJumpToMoment) {
      onJumpToMoment(report.replayMoment.turnId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full bg-r-bg flex flex-col sticky"
          style={{
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            height: 'calc(100vh - var(--header-height, 89px))',
            top: 'var(--header-height, 89px)'
          }}
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-r-accent-purple rounded-full flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-display text-r-text-primary" style={{ fontSize: 20, fontWeight: 600 }}>Feedback</h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-r-text-secondary"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div 
            ref={feedbackRailRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="p-6 space-y-8">
              {/* Overall Assessment */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                <h3 className="font-display text-r-text-primary mb-3" style={{ fontSize: 18, fontWeight: 600 }}>Overall Assessment</h3>
                <p className="font-body text-r-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {report.overallAssessment}
                </p>
              </div>

              {/* How You Came Across */}
              <div className="bg-r-surface p-5" style={{ borderRadius: 'var(--r-radius-lg)', borderLeft: '3px solid var(--r-accent-purple)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-r-accent-purple rounded-full flex items-center justify-center">
                    <Mic className="w-2.5 h-2.5 text-white" />
                  </div>
                  <h3 className="font-display text-r-text-primary" style={{ fontSize: 16, fontWeight: 600 }}>How You Came Across</h3>
                </div>
                <p className="font-body text-r-text-primary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {report.howYouCameAcross}
                </p>
                {audioAnalysis && (
                  <div className="mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="font-body text-r-text-secondary" style={{ fontSize: 12 }}>
                      Primary emotion: <span className="text-r-text-primary font-medium">{audioAnalysis.primaryEmotion}</span>
                      <span className="ml-1">
                        ({Math.round(audioAnalysis.confidence * 100)}% confidence)
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* What Worked */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                <h3 className="font-display text-r-accent-mint mb-3" style={{ fontSize: 18, fontWeight: 600 }}>What Worked</h3>
                <ul className="space-y-2">
                  {report.whatWorked.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--r-accent-green)' }}>
                        <span className="text-r-accent-mint text-xs">✓</span>
                      </div>
                      <p className="font-body text-r-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                <h3 className="font-display text-r-accent-yellow mb-3" style={{ fontSize: 18, fontWeight: 600 }}>Opportunities</h3>
                <ul className="space-y-2">
                  {report.opportunities.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(221,207,80,0.2)' }}>
                        <span className="text-r-accent-yellow text-xs">↗</span>
                      </div>
                      <p className="font-body text-r-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Replay Moment */}
              <div>
                <h3 className="font-display text-r-text-primary mb-4" style={{ fontSize: 18, fontWeight: 600 }}>Replay Moment</h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-body text-r-text-secondary mb-2" style={{ fontSize: 12, fontWeight: 500 }}>What you said</p>
                    <p className="p-3 bg-r-surface rounded-lg font-body text-r-text-primary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                      "{report.replayMoment.originalMoment}"
                    </p>
                  </div>

                  <div>
                    <p className="font-body text-r-text-secondary mb-2" style={{ fontSize: 12, fontWeight: 500 }}>How you likely sounded</p>
                    <p className="p-3 rounded-lg font-body" style={{ fontSize: 14, lineHeight: 1.6, backgroundColor: 'rgba(221,207,80,0.1)', border: '1px solid rgba(221,207,80,0.2)', color: 'var(--r-accent-yellow)' }}>
                      {report.replayMoment.howYouLikelySounded}
                    </p>
                  </div>

                  <div>
                    <p className="font-body text-r-text-secondary mb-2" style={{ fontSize: 12, fontWeight: 500 }}>How it may have landed</p>
                    <p className="p-3 bg-r-surface rounded-lg font-body text-r-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                      {report.replayMoment.howItMayHaveLanded}
                    </p>
                  </div>

                  <div>
                    <p className="font-body text-r-text-secondary mb-2" style={{ fontSize: 12, fontWeight: 500 }}>Stronger version</p>
                    <p className="p-3 rounded-lg font-body text-r-accent-mint font-medium" style={{ fontSize: 14, lineHeight: 1.6, backgroundColor: 'rgba(152,225,211,0.1)', border: '2px solid rgba(152,225,211,0.2)' }}>
                      "{report.replayMoment.strongerVersion}"
                    </p>
                  </div>

                  <div>
                    <p className="font-body text-r-text-secondary mb-2" style={{ fontSize: 12, fontWeight: 500 }}>Delivery tip</p>
                    <p className="p-3 rounded-lg font-body" style={{ fontSize: 14, lineHeight: 1.6, backgroundColor: 'rgba(62,91,242,0.1)', border: '1px solid rgba(62,91,242,0.2)', color: 'var(--r-accent-blue)' }}>
                      {report.replayMoment.deliveryTip}
                    </p>
                  </div>

                  {/* Jump to moment button */}
                  {report.replayMoment.turnId && (
                    <Button
                      onClick={handleJumpToMoment}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Jump to moment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Run it again */}
          {onRunAgain && (
            <div className="p-6 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={onRunAgain}
                className="w-full font-geist text-r-text-primary flex items-center justify-center gap-2 uppercase"
                style={{
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  borderRadius: 40,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <Play className="w-4 h-4" />
                Run it again
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
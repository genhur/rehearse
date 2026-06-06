import { motion, AnimatePresence } from 'motion/react';
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
          className="w-full h-full bg-background border-l border-border flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold">Feedback</h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              {/* Overall Assessment */}
              <div>
                <h3 className="text-base font-semibold mb-3 text-gray-900">Overall Assessment</h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {report.overallAssessment}
                </p>
              </div>

              {/* How You Came Across - Highlighted Section */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                    <Mic className="w-2.5 h-2.5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-purple-900">How You Came Across</h3>
                </div>
                <p className="text-purple-800 font-medium leading-relaxed">
                  {report.howYouCameAcross}
                </p>
                {audioAnalysis && (
                  <div className="mt-3 px-3 py-2 bg-white/60 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700">
                      Primary emotion: <span className="font-medium">{audioAnalysis.primaryEmotion}</span> 
                      <span className="text-purple-600 ml-1">
                        ({Math.round(audioAnalysis.confidence * 100)}% confidence)
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* What Worked */}
              <div>
                <h3 className="text-base font-semibold mb-3 text-green-700">What Worked</h3>
                <ul className="space-y-2">
                  {report.whatWorked.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 text-xs">✓</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div>
                <h3 className="text-base font-semibold mb-3 text-orange-700">Opportunities</h3>
                <ul className="space-y-2">
                  {report.opportunities.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-orange-600 text-xs">↗</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Replay Moment */}
              <div>
                <h3 className="text-base font-semibold mb-4 text-gray-900">Replay Moment</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">What you said</p>
                    <p className="p-3 bg-gray-50 rounded-lg text-sm leading-relaxed">
                      "{report.replayMoment.originalMoment}"
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">How you likely sounded</p>
                    <p className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm leading-relaxed text-orange-800">
                      {report.replayMoment.howYouLikelySounded}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">How it may have landed</p>
                    <p className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed text-gray-700">
                      {report.replayMoment.howItMayHaveLanded}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Stronger version</p>
                    <p className="p-3 bg-green-50 border-2 border-green-200 rounded-lg text-sm leading-relaxed text-green-800 font-medium">
                      "{report.replayMoment.strongerVersion}"
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Delivery tip</p>
                    <p className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm leading-relaxed text-blue-800">
                      💡 {report.replayMoment.deliveryTip}
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

          {/* Footer with Run it again */}
          {onRunAgain && (
            <div className="border-t border-border p-6 bg-card/30">
              <Button 
                onClick={onRunAgain} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Run it again
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { ArrowRight, Mic, Play, Home } from 'lucide-react';
import { sessionStorage, Session, RehearsalAttempt, FeedbackReport, AudioAnalysis } from '../../../lib/session';

export function Debrief() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<RehearsalAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        navigate('/');
        return;
      }

      const sessionData = sessionStorage.getSession(sessionId);
      if (!sessionData) {
        setError('Session not found. Please start a new conversation.');
        setLoading(false);
        return;
      }

      const attemptData = sessionStorage.getCurrentAttempt(sessionId);
      if (!attemptData || !attemptData.feedbackReport) {
        setError('No feedback report available. Complete a conversation to see analysis.');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setCurrentAttempt(attemptData);
      setLoading(false);
    }

    loadSession();
  }, [sessionId, navigate]);

  const handleRunAgain = () => {
    navigate(`/conversation/${sessionId}`);
  };

  const handleBackHome = () => {
    navigate('/');
  };

  const handleViewConversation = () => {
    navigate(`/conversation/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Mic className="w-8 h-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your feedback...</p>
        </div>
      </div>
    );
  }

  if (error || !session || !currentAttempt?.feedbackReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-4">{error || 'Feedback not available'}</p>
          <Button onClick={handleBackHome} variant="secondary">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { feedbackReport, audioAnalysis } = currentAttempt;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Feedback Report</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-2">{session.scenario}</p>
          <p className="text-sm text-muted-foreground">
            Attempt {currentAttempt.attemptNumber} · {currentAttempt.messages.length} messages
            {audioAnalysis && ` · Audio analyzed`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Overall Assessment */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-4">Overall Assessment</h2>
            <p className="text-muted-foreground leading-relaxed">{feedbackReport.overallAssessment}</p>
          </div>

          {/* How You Came Across - Highlighted Section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                <Mic className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-purple-900">How You Came Across</h2>
            </div>
            <p className="text-purple-800 text-lg font-medium leading-relaxed">
              {feedbackReport.howYouCameAcross}
            </p>
            {audioAnalysis && (
              <div className="mt-4 px-4 py-2 bg-white/60 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700">
                  Primary emotion detected: <span className="font-medium">{audioAnalysis.primaryEmotion}</span> 
                  <span className="text-purple-600 ml-1">
                    ({Math.round(audioAnalysis.confidence * 100)}% confidence)
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* What Worked */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-4 text-green-700">What Worked</h2>
            <ul className="space-y-3">
              {feedbackReport.whatWorked.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <p className="text-muted-foreground">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-4 text-orange-700">Opportunities</h2>
            <ul className="space-y-3">
              {feedbackReport.opportunities.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-600 text-sm">↗</span>
                  </div>
                  <p className="text-muted-foreground">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Replay Moment */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Replay Moment</h2>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">What you said</p>
                <p className="p-4 bg-secondary rounded-xl text-sm leading-relaxed">
                  "{feedbackReport.replayMoment.originalMoment}"
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">How you likely sounded</p>
                <p className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm leading-relaxed text-orange-800">
                  {feedbackReport.replayMoment.howYouLikelySounded}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">How it may have landed</p>
                <p className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm leading-relaxed text-gray-700">
                  {feedbackReport.replayMoment.howItMayHaveLanded}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Stronger version</p>
                <p className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm leading-relaxed text-green-800 font-medium">
                  "{feedbackReport.replayMoment.strongerVersion}"
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Delivery tip</p>
                <p className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm leading-relaxed text-blue-800">
                  💡 {feedbackReport.replayMoment.deliveryTip}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleRunAgain} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Run it again
            </Button>
            
            <div className="flex gap-4">
              <Button onClick={handleViewConversation} variant="outline" className="flex-1">
                View Conversation
              </Button>
              <Button onClick={handleBackHome} variant="outline" className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Back Home
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
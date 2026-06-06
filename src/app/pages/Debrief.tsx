import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { ArrowRight, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { analyzeSession, AnalysisResult } from '../../../lib/analysis';
import { sessionStorage, Session } from '../../../lib/session';

export function Debrief() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessionAndAnalyze() {
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

      setSession(sessionData);

      // For now, skip the Valence analysis if no messages exist
      if (sessionData.messages.length === 0) {
        setError('No conversation transcript found. Complete a conversation to see analysis.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Convert messages to transcript format
        const transcript = sessionData.messages.map(msg => ({
          speaker: msg.role === 'user' ? 'user' : 'agent',
          text: msg.text
        }));
        
        // TODO: For now, skip actual audio analysis and show mock analysis
        // When audio recording is integrated, use the actual audio file
        // const result = await analyzeSession(sessionData.scenario, transcript, audioFile);
        
        // Mock analysis for now
        const mockResult = {
          coaching: {
            summary: "You showed good engagement throughout the conversation and maintained active listening.",
            strengths: [
              "Maintained calm tone during difficult topics",
              "Asked clarifying questions at appropriate moments", 
              "Stayed focused on the conversation goals"
            ],
            opportunities: [
              "Lead with more confidence in your statements",
              "Address concerns more directly rather than deflecting",
              "Prepare more detailed responses to potential objections"
            ],
            replayMoment: {
              originalResponse: transcript.find(t => t.speaker === 'user')?.text || "I'm worried about this situation...",
              interpretation: "Came across as uncertain and lacking conviction",
              improvedResponse: "I'd like to share my concerns and discuss how we can address them together.",
              expectedImpact: "Shows leadership while inviting collaboration"
            },
            emotionalInsights: {
              confidenceTrend: "Started nervous but gained confidence as the conversation progressed",
              anxietyMoments: ["Beginning of conversation showed elevated concern"],
              defensivenessMoments: ["Became cautious when discussing sensitive topics"]
            }
          },
          emotionData: {
            predictions: [
              { timestamp: 0, emotion: 'nervous', confidence: 0.7, valence: 0.3, arousal: 0.6 },
              { timestamp: 30, emotion: 'concerned', confidence: 0.8, valence: 0.4, arousal: 0.5 },
              { timestamp: 60, emotion: 'confident', confidence: 0.6, valence: 0.7, arousal: 0.4 }
            ],
            summary: {
              dominant_emotion: 'concerned',
              average_valence: 0.47,
              average_arousal: 0.5
            }
          }
        };
        
        setAnalysis(mockResult);
      } catch (err) {
        console.error('[Debrief] Analysis failed:', err);
        setError('Failed to analyze the conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadSessionAndAnalyze();
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing your conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-4">{error || 'Analysis not available'}</p>
          <Button onClick={() => navigate('/')} variant="secondary">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { coaching, emotionData } = analysis;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="mb-2">Simulation Complete</h1>
          <p className="text-lg text-muted-foreground mb-4">{session?.scenario}</p>
          <p className="text-muted-foreground">{coaching.summary}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Emotional Timeline */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-6">Emotional Timeline</h2>
            <div className="space-y-4">
              {emotionData.predictions.slice(0, 5).map((prediction, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-16 text-muted-foreground">
                    {Math.floor(prediction.timestamp)}s
                  </div>
                  <div className="flex gap-3 items-start">
                    {prediction.valence < 0.5 ? (
                      <TrendingDown className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    )}
                    <p>{prediction.emotion} detected (confidence: {Math.round(prediction.confidence * 100)}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-4">Strengths</h2>
            <ul className="space-y-2 text-muted-foreground">
              {coaching.strengths.map((strength, i) => (
                <li key={i}>• {strength}</li>
              ))}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-4">Opportunities</h2>
            <ul className="space-y-2 text-muted-foreground">
              {coaching.opportunities.map((opportunity, i) => (
                <li key={i}>• {opportunity}</li>
              ))}
            </ul>
          </div>

          {/* Replay Moment */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-6">Replay Moment</h2>
            <div className="space-y-6">
              <div>
                <p className="text-muted-foreground mb-2">What you said</p>
                <p className="p-4 bg-secondary rounded-xl">{coaching.replayMoment.originalResponse}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">How it came across</p>
                <p className="p-4 bg-secondary rounded-xl">{coaching.replayMoment.interpretation}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Improved response</p>
                <p className="p-4 bg-secondary rounded-xl border-2 border-[#10b981]">
                  {coaching.replayMoment.improvedResponse}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Expected impact</p>
                <p className="p-4 bg-secondary rounded-xl">{coaching.replayMoment.expectedImpact}</p>
              </div>
            </div>
          </div>

          {/* Emotional Insights */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-6">Emotional Analysis</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Confidence Trend</p>
                <p>{coaching.emotionalInsights.confidenceTrend}</p>
              </div>
              {coaching.emotionalInsights.anxietyMoments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Anxiety Moments</p>
                  <ul className="text-sm space-y-1">
                    {coaching.emotionalInsights.anxietyMoments.map((moment, i) => (
                      <li key={i}>• {moment}</li>
                    ))}
                  </ul>
                </div>
              )}
              {coaching.emotionalInsights.defensivenessMoments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Defensiveness Moments</p>
                  <ul className="text-sm space-y-1">
                    {coaching.emotionalInsights.defensivenessMoments.map((moment, i) => (
                      <li key={i}>• {moment}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => navigate('/')} variant="secondary" className="flex-1">
              Back to Home
            </Button>
            <Button onClick={() => navigate(`/conversation/${sessionId}`)} variant="outline" className="flex-1">
              View Conversation
            </Button>
            <Button onClick={() => navigate('/setup/custom')} className="flex-1">
              Try Again
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

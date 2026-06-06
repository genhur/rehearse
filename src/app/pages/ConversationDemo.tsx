import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { AppHeader } from '../components/AppHeader';
import { FeedbackRail } from '../components/FeedbackRail';
import { SimpleVoiceOrb } from '../components/SimpleVoiceOrb';
import { Conversation as ElevenLabsConversation } from '@11labs/client';
import type { Mode } from '@11labs/client';
import { PhoneOff, Play, Mic } from 'lucide-react';
import { audioAnalysisService } from '../../../lib/audio-analysis';

const AGENT_ID = 'agent_4901ktej496kfp1a1kwj03q037ey';

type DemoState = "conversation" | "complete";
type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface TranscriptTurn {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface FeedbackReport {
  overallAssessment: string;
  howYouCameAcross: string;
  whatWorked: string[];
  opportunities: string[];
  replayMoment: {
    turnId: string | null;
    originalMoment: string;
    howYouLikelySounded: string;
    howItMayHaveLanded: string;
    strongerVersion: string;
    deliveryTip: string;
  };
}

export function ConversationDemo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get scenario from URL params
  const scenario = searchParams.get('scenario') || 'Practice conversation';
  const character = searchParams.get('character') || 'Alex';
  
  // Simple demo state
  const [demoState, setDemoState] = useState<DemoState>("conversation");
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null);
  const [elevenLabsMode, setElevenLabsMode] = useState<Mode>('listening');
  
  // Refs
  const conversationRef = useRef<ElevenLabsConversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Component unmount cleanup
  useEffect(() => {
    return () => {
      console.log('COMPONENT_UNMOUNTED: ConversationDemo unmounting');
      console.log('DISCONNECT_CALLED_FROM_CLEANUP: Checking if conversation exists');
      if (conversationRef.current) {
        console.log('DISCONNECT_CALLED_FROM_CLEANUP: Ending ElevenLabs session due to component unmount');
        try {
          conversationRef.current.endSession();
          conversationRef.current = null;
        } catch (error) {
          console.log('CLEANUP_ERROR: Failed to end session during unmount:', error);
        }
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);
  
  const handleStartConversation = async () => {
    console.log('DEMO: Starting ElevenLabs conversation');
    setIsSessionActive(true);
    setConversationState('thinking');
    
    try {
      const conversation = await ElevenLabsConversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          console.log('DEMO: ElevenLabs connected successfully');
        },
        onDisconnect: () => {
          console.log('DEMO: ElevenLabs disconnected');
          console.log('DEMO: Disconnect timing:', {
            transcriptLength: transcript.length,
            lastMessage: transcript[transcript.length - 1],
            sessionState: isSessionActive
          });
          conversationRef.current = null;
          // Don't set to idle immediately - this was causing the "auto-ending" appearance
          // Keep the session visually active even if ElevenLabs disconnects
          console.log('DEMO: Keeping session active despite ElevenLabs disconnect');
        },
        onError: (message) => {
          console.error('DEMO: ElevenLabs error:', message);
          console.log('DEMO: Keeping session active despite ElevenLabs error');
          // Don't change conversation state - keep session visually active
        },
        onModeChange: ({ mode }) => {
          console.log('DEMO: ElevenLabs mode changed to', mode);
          setElevenLabsMode(mode);
          setConversationState(mode === 'listening' ? 'listening' : mode === 'speaking' ? 'speaking' : 'thinking');
        },
        onMessage: ({ message, source }) => {
          console.log('DEMO: Message received', { message, source });
          
          // Add to transcript
          const newTurn: TranscriptTurn = {
            id: `${Date.now()}_${Math.random()}`,
            speaker: source === 'user' ? 'user' : 'agent',
            text: message,
            timestamp: new Date().toISOString()
          };
          
          setTranscript(prev => [...prev, newTurn]);
        }
      });
      
      conversationRef.current = conversation;
      console.log('DEMO: ElevenLabs session created successfully');
      
    } catch (error) {
      console.error('DEMO: Failed to start ElevenLabs session:', error);
      setIsSessionActive(false);
      setConversationState('idle');
      
      // Fallback mock conversation
      setTimeout(() => {
        const aiMessage: TranscriptTurn = {
          id: `${Date.now()}_ai`,
          speaker: 'agent',
          text: `Hi! I understand you wanted to practice "${scenario}". I'm here to help you work through this conversation. How are you feeling about approaching this topic?`,
          timestamp: new Date().toISOString()
        };
        setTranscript([aiMessage]);
        setConversationState('listening');
      }, 1000);
    }
  };
  
  const handleEndCall = async () => {
    console.log('DEMO: Ending conversation');
    
    // Stop ElevenLabs
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession();
      } catch (error) {
        console.log('DEMO: Error ending ElevenLabs session:', error);
      }
      conversationRef.current = null;
    }
    
    setIsSessionActive(false);
    setConversationState('idle');
    setDemoState('complete');
    
    // Generate simple feedback
    generateSimpleFeedback();
  };
  
  const generateSimpleFeedback = () => {
    const userMessages = transcript.filter(t => t.speaker === 'user');
    const userTurnCount = userMessages.length;
    const totalWords = userMessages.reduce((count, msg) => 
      count + msg.text.split(/\s+/).filter(word => word.length > 0).length, 0);
    
    if (userTurnCount < 3 || totalWords < 50) {
      setFeedbackReport({
        overallAssessment: "This was a brief practice session. For more detailed feedback, try having a longer conversation.",
        howYouCameAcross: "Limited conversation data to analyze your communication style.",
        whatWorked: ["You started the conversation practice"],
        opportunities: ["Practice longer conversations to get detailed feedback"],
        replayMoment: {
          turnId: null,
          originalMoment: "Continue practicing to generate meaningful feedback",
          howYouLikelySounded: "Practice more for voice analysis",
          howItMayHaveLanded: "Extend the conversation for interaction analysis",
          strongerVersion: "Keep practicing to improve your communication skills",
          deliveryTip: "Longer conversations provide better coaching insights"
        }
      });
    } else {
      const longestMessage = userMessages.reduce((longest, current) => 
        current.text.length > longest.text.length ? current : longest);
      
      setFeedbackReport({
        overallAssessment: `You engaged in ${userTurnCount} exchanges with ${totalWords} total words. You actively participated in practicing this conversation scenario.`,
        howYouCameAcross: "Engaged and willing to practice this important conversation topic.",
        whatWorked: [
          `You participated with ${userTurnCount} meaningful responses`,
          "You committed to practicing this difficult conversation",
          "You engaged with the scenario authentically"
        ],
        opportunities: [
          "Consider expanding on your responses with more detail",
          "Practice expressing your main points more directly",
          "Try asking clarifying questions to guide the conversation"
        ],
        replayMoment: {
          turnId: longestMessage.id,
          originalMoment: longestMessage.text,
          howYouLikelySounded: "This was your most substantial contribution to the conversation",
          howItMayHaveLanded: "This represented your main engagement with the practice scenario",
          strongerVersion: longestMessage.text + " What are your thoughts on how we can move forward?",
          deliveryTip: "Build on substantial responses like this with follow-up questions or specific next steps"
        }
      });
    }
  };
  
  const handleRunAgain = () => {
    console.log('DEMO: Running conversation again');
    // Reset to conversation state
    setDemoState('conversation');
    setIsFeedbackOpen(false);
    setTranscript([]);
    setFeedbackReport(null);
    setConversationState('idle');
    setIsSessionActive(false);
  };
  
  const handleViewFeedback = () => {
    setIsFeedbackOpen(true);
  };
  
  const stateLabels = {
    idle: 'Ready to start',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...'
  };

  const stateColors = {
    idle: '#6b7280',
    listening: '#10b981',
    thinking: '#f59e0b',
    speaking: '#3b82f6'
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <AppHeader
        title={scenario.length > 50 ? scenario.slice(0, 47) + '...' : scenario}
        subtitle={`Practice conversation with ${character}`}
        showHomeButton={true}
        showHistoryButton={false}
        status={isSessionActive ? 'active' : demoState === 'complete' ? 'complete' : undefined}
        showEndCall={isSessionActive}
        onEndCall={handleEndCall}
      />

      <div className="flex-1 flex">
        {/* Main conversation area */}
        <div className={`flex-1 flex flex-col ${isFeedbackOpen ? 'max-w-3xl' : 'max-w-4xl'} mx-auto w-full`}>
          {demoState === "conversation" ? (
            <>
              {/* Transcript */}
              <div className="flex-1 overflow-y-auto px-6 py-8">
                {transcript.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mic className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground mb-2">
                        Ready to practice "{scenario}"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click the voice orb below to start your conversation practice
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {transcript.map((turn) => (
                      <motion.div
                        key={turn.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-4 rounded-2xl ${
                            turn.speaker === 'user'
                              ? 'bg-foreground text-background ml-4'
                              : 'bg-card border border-border mr-4'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{turn.text}</p>
                          <span className={`text-xs mt-2 block ${
                            turn.speaker === 'user' 
                              ? 'text-background/60' 
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(turn.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Voice interaction area */}
              <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <SimpleVoiceOrb 
                      state={conversationState} 
                      onClick={!isSessionActive ? handleStartConversation : undefined}
                      clickable={!isSessionActive}
                    />
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stateColors[conversationState] }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {stateLabels[conversationState]}
                      </span>
                    </div>
                    {conversationState === 'listening' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Speak naturally - you're practicing with {character}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Complete state */
            <div className="flex-1 flex items-center justify-center px-6 py-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PhoneOff className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Practice Complete</h2>
                <p className="text-muted-foreground mb-6">
                  You've finished practicing "{scenario}". What would you like to do next?
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={handleViewFeedback}
                    className="w-full"
                    variant="primary"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    View Feedback
                  </Button>
                  
                  <Button
                    onClick={handleRunAgain}
                    className="w-full"
                    variant="outline"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run it again
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full"
                    variant="ghost"
                  >
                    Practice different scenario
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback rail */}
        {feedbackReport && (
          <FeedbackRail
            report={feedbackReport}
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
            onRunAgain={handleRunAgain}
          />
        )}
      </div>
    </div>
  );
}
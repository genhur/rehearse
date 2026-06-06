import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { sessionStorage, Session, Message } from '../../../lib/session';
import { SimpleVoiceOrb } from '../components/SimpleVoiceOrb';
import { Conversation as ElevenLabsConversation } from '@11labs/client';
import type { Mode, Status } from '@11labs/client';
import { Phone, PhoneOff, MessageCircle } from 'lucide-react';
import { CoachPanel } from '../components/CoachPanel';
import { liveCoachingService, CoachNote } from '../../../lib/live-coaching';

const AGENT_ID = 'agent_4901ktej496kfp1a1kwj03q037ey';

type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function Conversation() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [elevenLabsMode, setElevenLabsMode] = useState<Mode>('listening');
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [isCoachPanelOpen, setIsCoachPanelOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<ElevenLabsConversation | null>(null);

  useEffect(() => {
    console.log('CONVERSATION_PAGE_MOUNTED', sessionId);
    
    if (!sessionId) {
      navigate('/');
      return;
    }

    const sessionData = sessionStorage.getSession(sessionId);
    if (!sessionData) {
      navigate('/');
      return;
    }

    setSession(sessionData);
    setMessages(sessionData.messages);
    
    // Load existing coach notes for this session
    const existingNotes = liveCoachingService.getCoachNotes(sessionId);
    setCoachNotes(existingNotes);
    
    // Add initial intake message if this is a new intake session
    if (sessionData.phase === 'intake' && sessionData.messages.length === 0) {
      const initialMessage = sessionStorage.addMessage(
        sessionId,
        'assistant',
        'What conversation do you need to rehearse?'
      );
      setMessages([initialMessage]);
      
      // Auto-start conversation immediately
      setTimeout(() => {
        handleStartConversation();
      }, 500);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartConversation = async () => {
    if (!sessionId) return;
    
    setIsSessionActive(true);
    setConversationState('listening');
    
    try {
      const conversation = await ElevenLabsConversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          console.log('[Conversation] ElevenLabs connected');
        },
        onDisconnect: () => {
          console.log('[Conversation] ElevenLabs disconnected');
          conversationRef.current = null;
          setIsSessionActive(false);
          setConversationState('idle');
        },
        onError: (message) => {
          console.error('[Conversation] ElevenLabs error:', message);
          setIsSessionActive(false);
          setConversationState('idle');
        },
        onModeChange: ({ mode }) => {
          setElevenLabsMode(mode);
          setConversationState(mode === 'listening' ? 'listening' : mode === 'speaking' ? 'speaking' : 'thinking');
        },
        onMessage: ({ message, source }) => {
          // Add message to session storage
          const role = source === 'user' ? 'user' : 'assistant';
          const newMessage = sessionStorage.addMessage(sessionId, role, message);
          setMessages(prev => [...prev, newMessage]);
          console.log('📝 USER_MESSAGE_FINALIZED', { 
            role, 
            messageId: newMessage.id, 
            text: message,
            sessionId 
          });
          
          // Handle live coaching for user messages
          if (role === 'user' && session) {
            console.log('🎯 TRIGGERING_LIVE_COACHING', { messageId: newMessage.id });
            handleLiveCoaching(newMessage);
          } else {
            console.log('🎯 SKIPPING_LIVE_COACHING', { role, hasSession: !!session });
          }
          
          // Handle intake flow progression
          if (role === 'user' && session?.phase === 'intake') {
            handleIntakeResponse(message);
          }
        }
      });
      
      conversationRef.current = conversation;
    } catch (error) {
      console.error('[Conversation] Failed to start ElevenLabs session:', error);
      setIsSessionActive(false);
      setConversationState('idle');
      
      // Fallback to mock conversation for testing
      simulateConversation();
    }
  };

  const handleLiveCoaching = async (userMessage: Message) => {
    if (!session || !sessionId) {
      console.log('🎯 COACH_ANALYSIS_SKIPPED', { hasSession: !!session, hasSessionId: !!sessionId });
      return;
    }
    
    // Get recent messages for context
    const recentMessages = messages.slice(-4); // Last 4 messages including this one
    
    const coachingRequest = {
      sessionId,
      latestUserMessage: userMessage,
      recentMessages,
      sessionContext: {
        scenario: session.scenario,
        role: session.role,
        phase: session.phase
      }
    };
    
    console.log('🎯 COACH_ANALYSIS_STARTING', {
      messageId: userMessage.id,
      messageText: userMessage.text,
      sessionId,
      currentCoachNotes: coachNotes.length
    });
    
    try {
      const note = await liveCoachingService.analyzeMessage(coachingRequest);
      if (note) {
        console.log('🎯 COACH_NOTE_RECEIVED', note);
        
        // Update messages state to include coach note flag
        setMessages(prev => {
          const updated = prev.map(m => 
            m.id === userMessage.id ? { ...m, hasCoachNote: true } : m
          );
          console.log('🎯 COACH_NOTE_ATTACHED_TO_MESSAGE', { messageId: userMessage.id, updated });
          return updated;
        });
        
        // Update session storage with the coach note flag
        const currentSession = sessionStorage.getSession(sessionId);
        if (currentSession) {
          const updatedMessages = currentSession.messages.map(m =>
            m.id === userMessage.id ? { ...m, hasCoachNote: true } : m
          );
          sessionStorage.updateSession(sessionId, { messages: updatedMessages });
          console.log('🎯 COACH_NOTE_SAVED_TO_STORAGE', { messageId: userMessage.id });
        }
        
        setCoachNotes(prev => {
          const newNotes = [...prev, note];
          console.log('🎯 COACH_PANEL_NOTE_COUNT', { 
            previousCount: prev.length, 
            newCount: newNotes.length 
          });
          return newNotes;
        });
        
        // Don't auto-open coach panel - inline notes are primary now
      } else {
        console.log('🎯 COACH_ANALYSIS_NO_NOTE_RETURNED');
      }
    } catch (error) {
      console.error('🎯 COACH_ANALYSIS_ERROR:', error);
    }
  };

  const handleIntakeResponse = (userMessage: string) => {
    if (!sessionId || !session) return;
    
    // Extract conversation topic and update session title
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple title extraction - take first 50 chars and clean up
    let newTitle = userMessage;
    if (userMessage.startsWith('I need to ')) {
      newTitle = userMessage.substring(10); // Remove "I need to "
    }
    newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
    if (newTitle.length > 50) {
      newTitle = newTitle.substring(0, 47) + '...';
    }
    
    // Try to infer the conversation partner
    let inferredRole = '';
    const roleKeywords = {
      'cofounder': ['cofounder', 'co-founder', 'business partner'],
      'manager': ['manager', 'boss', 'supervisor'],
      'partner': ['partner', 'girlfriend', 'boyfriend', 'spouse', 'wife', 'husband'],
      'friend': ['friend'],
      'parent': ['mom', 'dad', 'mother', 'father', 'parent'],
      'investor': ['investor', 'VC', 'venture capital']
    };
    
    for (const [role, keywords] of Object.entries(roleKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        inferredRole = role;
        break;
      }
    }
    
    // Update session with new info
    sessionStorage.updateSession(sessionId, { 
      scenario: newTitle,
      role: inferredRole
    });
    
    // Update local session state
    setSession(prev => prev ? { 
      ...prev, 
      scenario: newTitle, 
      role: inferredRole 
    } : null);
    
    console.log('[Conversation] Updated session:', { newTitle, inferredRole });
  };

  const handleEndConversation = async () => {
    if (!sessionId) return;
    
    // End ElevenLabs conversation
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    
    setIsSessionActive(false);
    setConversationState('idle');
    
    // Update session status to completed
    sessionStorage.updateSessionStatus(sessionId, 'completed');
    
    // Clear live coaching for this session
    liveCoachingService.clearSession(sessionId);
    
    // Update local session state to reflect completion
    setSession(prev => prev ? { ...prev, status: 'completed' } : null);
  };

  const handleViewDebrief = () => {
    if (!sessionId) return;
    navigate(`/debrief/${sessionId}`);
  };

  const handlePracticeAgain = () => {
    navigate('/');
  };

  const cleanAssistantText = (text: string): string => {
    return text
      // Remove XML-like tags like <Cofounder>, <Manager>, etc.
      .replace(/<[^>]+>/g, '')
      // Remove emotional stage directions in brackets like [stunned], [concerned], etc.
      .replace(/\[[^\]]+\]/g, '')
      // Clean up any double spaces
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();
  };

  const handleAddTestCoachNote = () => {
    if (!sessionId) return;
    
    // Get the latest user message
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    
    const latestUserMessage = userMessages[userMessages.length - 1];
    
    console.log('🎯 ADDING_TEST_COACH_NOTE', {
      messageId: latestUserMessage.id,
      messageText: latestUserMessage.text
    });
    
    const testNote = {
      id: `note_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId: latestUserMessage.id,
      sessionId,
      type: 'vague_response' as any,
      severity: 'neutral' as any,
      text: `You said "${latestUserMessage.text.slice(0, 30)}..." without giving specifics when they likely need concrete details.`,
      suggestion: 'Try: "We have exactly 8 weeks of runway left based on current burn rate."',
      createdAt: Date.now()
    };
    
    // Add note to coaching service
    liveCoachingService.addCoachNotePublic(sessionId, testNote);
    
    // Update messages state to include coach note flag
    setMessages(prev => prev.map(m => 
      m.id === latestUserMessage.id ? { ...m, hasCoachNote: true } : m
    ));
    
    // Update session storage with the coach note flag
    const currentSession = sessionStorage.getSession(sessionId);
    if (currentSession) {
      const updatedMessages = currentSession.messages.map(m =>
        m.id === latestUserMessage.id ? { ...m, hasCoachNote: true } : m
      );
      sessionStorage.updateSession(sessionId, { messages: updatedMessages });
    }
    
    // Update coach notes state
    setCoachNotes(prev => [...prev, testNote]);
    
    // Don't auto-open panel - inline note will show
    
    console.log('🎯 TEST_COACH_NOTE_ADDED', testNote);
  };

  const calculateDuration = () => {
    if (!session || messages.length === 0) return '0s';
    
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const durationMs = lastMessage.timestamp - firstMessage.timestamp;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Mock conversation simulation - TODO: Replace with real ElevenLabs integration
  const simulateConversation = () => {
    if (!sessionId) return;

    // Mock initial AI greeting
    setTimeout(() => {
      const aiMessage = sessionStorage.addMessage(
        sessionId,
        'assistant',
        `Hi there! I understand you wanted to discuss ${session?.scenario.toLowerCase()}. I appreciate you making time for this important conversation. How are you feeling about this topic?`
      );
      setMessages(prev => [...prev, aiMessage]);
      setConversationState('listening');
    }, 2000);
  };

  const handleMockUserInput = (text: string) => {
    if (!sessionId) return;
    
    const userMessage = sessionStorage.addMessage(sessionId, 'user', text);
    setMessages(prev => [...prev, userMessage]);
    
    console.log('📝 USER_MESSAGE_FINALIZED (MOCK)', { 
      messageId: userMessage.id, 
      text,
      sessionId 
    });
    
    // Handle live coaching for mock messages
    if (session) {
      console.log('🎯 TRIGGERING_LIVE_COACHING (MOCK)', { messageId: userMessage.id });
      handleLiveCoaching(userMessage);
    }
    
    // Handle intake response for mock too
    if (session?.phase === 'intake') {
      handleIntakeResponse(text);
    }
    
    setConversationState('thinking');
    
    // Mock AI response
    setTimeout(() => {
      let responses: string[];
      
      if (session?.phase === 'intake') {
        responses = [
          "That sounds important. Who do you need to have this conversation with?",
          "I understand. What outcome are you hoping for from this conversation?",
          "That's a significant topic. What are you most worried might happen during this conversation?",
          "Got it. I'll help you practice this. What's your main goal for this conversation?"
        ];
      } else {
        responses = [
          "I can understand why that would be concerning. Can you tell me more about your specific worries?",
          "That sounds like a challenging situation. What outcome are you hoping for?",
          "I appreciate you sharing that with me. What do you think would help move this conversation forward?",
          "That's a valid concern. How do you think the other person might be feeling about this?"
        ];
      }
      
      const aiMessage = sessionStorage.addMessage(
        sessionId,
        'assistant',
        responses[Math.floor(Math.random() * responses.length)]
      );
      setMessages(prev => [...prev, aiMessage]);
      setConversationState('listening');
    }, 1500);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

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
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium">{session.scenario}</h1>
              <p className="text-sm text-muted-foreground">
                {session.phase === 'intake' 
                  ? 'Tell Rehearse what conversation you need to practice.'
                  : session.role 
                    ? `Conversation with ${session.role}`
                    : 'Conversation practice'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Voice state indicator */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stateColors[conversationState] }}
                />
                <span className="text-sm text-muted-foreground">
                  {stateLabels[conversationState]}
                </span>
              </div>
              
              {/* Desktop coach toggle - secondary to inline notes */}
              {coachNotes.length > 1 && (
                <div className="hidden md:block">
                  <Button
                    onClick={() => setIsCoachPanelOpen(!isCoachPanelOpen)}
                    variant={isCoachPanelOpen ? 'default' : 'outline'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Coach History ({coachNotes.length})
                  </Button>
                </div>
              )}
              
              {isSessionActive ? (
                <Button
                  onClick={handleEndConversation}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  End
                </Button>
              ) : session?.status === 'completed' ? (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Duration: {calculateDuration()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Messages: {messages.length}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Transcript area */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">
                    Starting your conversation practice...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    id={`message-${message.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-foreground text-background ml-4'
                          : 'bg-card border border-border mr-4'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">
                            {message.role === 'assistant' ? cleanAssistantText(message.text) : message.text}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${
                              message.role === 'user' 
                                ? 'text-background/60' 
                                : 'text-muted-foreground'
                            }`}>
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Inline coach note for user messages */}
                    {message.role === 'user' && message.hasCoachNote && (() => {
                      const coachNote = coachNotes.find(note => note.messageId === message.id);
                      return coachNote ? (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="ml-4 mr-[30%] mt-2"
                        >
                          <div className="bg-blue-50 border-l-4 border-blue-200 p-3 rounded-r-lg">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-600 text-sm font-medium">Coach</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1 italic">"{coachNote.text}"</p>
                            {coachNote.suggestion && (
                              <p className="text-sm text-blue-700 mt-2">
                                <span className="font-medium">Try:</span> "{coachNote.suggestion}"
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ) : null;
                    })()}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Completion banner */}
          {session?.status === 'completed' && (
            <div className="border-t border-border bg-green-50 p-6">
              <div className="max-w-md mx-auto text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <h3 className="text-lg font-medium">Rehearsal Complete</h3>
                </div>
                
                <div className="flex justify-center gap-6 mb-6 text-sm text-muted-foreground">
                  <span>Duration: {calculateDuration()}</span>
                  <span>Messages: {messages.length}</span>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleViewDebrief}
                    variant="default"
                    size="sm"
                    className="flex-1"
                  >
                    View Debrief
                  </Button>
                  <Button
                    onClick={handlePracticeAgain}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Practice Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Voice interaction area */}
          {isSessionActive && (
            <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <SimpleVoiceOrb state={conversationState} />
                  <p className="text-sm text-muted-foreground mt-4">
                    {conversationState === 'listening' && 'Speak naturally'}
                    {conversationState === 'thinking' && 'Processing your response...'}
                    {conversationState === 'speaking' && 'AI is responding...'}
                  </p>
                </div>
              </div>
              
              {/* Mock input for testing */}
              <div className="mt-6 flex gap-2 justify-center flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMockUserInput("I'm really worried about how they'll react to this news.")}
                >
                  Mock: Worried
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMockUserInput("I think we need to be more transparent about our financial situation.")}
                >
                  Mock: Transparent
                </Button>
                {/* Debug test coach note button - dev only */}
                {import.meta.env.DEV && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleAddTestCoachNote}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    🧪 Add Test Coach Note
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coach Panel */}
        <CoachPanel
          isOpen={isCoachPanelOpen}
          onToggle={() => setIsCoachPanelOpen(!isCoachPanelOpen)}
          latestNote={coachNotes.length > 0 ? coachNotes[coachNotes.length - 1] : null}
          allNotes={coachNotes}
          onNoteClick={(messageId) => {
            setHighlightedMessageId(messageId);
            // Scroll to message
            const messageElement = document.getElementById(`message-${messageId}`);
            messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          isConversationActive={isSessionActive}
        />
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { sessionStorage, Session, Message } from '../../../lib/session';
import { SimpleVoiceOrb } from '../components/SimpleVoiceOrb';
import { Conversation as ElevenLabsConversation } from '@11labs/client';
import type { Mode, Status } from '@11labs/client';
import { Phone, PhoneOff } from 'lucide-react';

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
          console.log('[Conversation] New message:', { role, message });
          
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
                          <p className="text-sm leading-relaxed">{message.text}</p>
                          <span className={`text-xs mt-2 block ${
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
              <div className="mt-6 flex gap-2 justify-center">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { sessionStorage, Session, RehearsalAttempt, Message, Annotation, KeyMoment, AudioAnalysis, FeedbackReport } from '../../../lib/session';
import { SimpleVoiceOrb } from '../components/SimpleVoiceOrb';
import { Conversation as ElevenLabsConversation } from '@11labs/client';
import type { Mode, Status } from '@11labs/client';
import { Phone, PhoneOff, Play, Mic } from 'lucide-react';
import { audioRecordingService, audioAnalysisService } from '../../../lib/audio-analysis';

const AGENT_ID = 'agent_4901ktej496kfp1a1kwj03q037ey';

type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function Conversation() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<RehearsalAttempt | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [elevenLabsMode, setElevenLabsMode] = useState<Mode>('listening');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showKeyMoments, setShowKeyMoments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
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
    
    // Get current attempt
    const currentAttemptData = sessionStorage.getCurrentAttempt(sessionId);
    setCurrentAttempt(currentAttemptData);
    setMessages(currentAttemptData ? currentAttemptData.messages : []);
    
    // Add initial intake message if this is a new intake session
    if (sessionData.phase === 'intake' && (!currentAttemptData || currentAttemptData.messages.length === 0)) {
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
    
    // Start audio recording
    const recordingStarted = await audioRecordingService.startRecording();
    if (recordingStarted) {
      setIsRecording(true);
    }
    
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
          
          // Check for user decline phrases
          if (role === 'user') {
            checkForUserDecline(message);
          }
          
          // No live coaching during active conversation
          
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

  const generateAnnotations = async () => {
    if (!session || !sessionId) return;
    
    // Analyze communication moments from the full conversation
    const communicationMoments = identifyCommunicationMoments(messages);
    
    console.log('🎯 COMMUNICATION_MOMENTS_ANALYSIS', {
      totalMessages: messages.length,
      momentsFound: communicationMoments.length,
      moments: communicationMoments.map(m => ({
        title: m.title,
        significance: m.significance,
        type: m.type
      }))
    });
    
    if (communicationMoments.length === 0) {
      console.log('🎯 NO_COMMUNICATION_MOMENTS_FOUND');
      // Mark debrief complete even if no moments found
      sessionStorage.markDebriefComplete(sessionId);
      setCurrentAttempt(prev => prev ? { ...prev, debriefComplete: true } : null);
      setSession(prev => prev ? {
        ...prev,
        attempts: prev.attempts.map(attempt => 
          attempt.id === prev.currentAttemptId
            ? { ...attempt, debriefComplete: true }
            : attempt
        )
      } : null);
      return;
    }
    
    // Generate annotations for the most significant moments (2-4 max)
    const topMoments = communicationMoments.slice(0, 3);
    
    const annotations: Annotation[] = [];
    const keyMoments: KeyMoment[] = [];
    
    topMoments.forEach((moment) => {
      const annotation = sessionStorage.addAnnotation(
        sessionId,
        moment.userMessageId,
        moment.title,
        moment.description,
        moment.type
      );
      
      const keyMoment = sessionStorage.addKeyMoment(
        sessionId,
        annotation.id,
        moment.userMessageId,
        moment.title,
        moment.description
      );
      
      annotations.push(annotation);
      keyMoments.push(keyMoment);
    });
    
    // Update local attempt state
    setCurrentAttempt(prev => prev ? {
      ...prev,
      debriefComplete: true,
      annotations,
      keyMoments
    } : null);
    
    // Update session state as well
    setSession(prev => prev ? {
      ...prev,
      attempts: prev.attempts.map(attempt => 
        attempt.id === prev.currentAttemptId
          ? { ...attempt, debriefComplete: true, annotations, keyMoments }
          : attempt
      )
    } : null);
    
    // Update messages to show annotation flags
    setMessages(prev => prev.map(m => ({
      ...m,
      hasAnnotation: annotations.some(a => a.messageId === m.id)
    })));
  };

  const identifyCommunicationMoments = (messages: Message[]) => {
    const moments: Array<{
      userMessageId: string;
      title: string;
      description: string;
      type: Annotation['type'];
      significance: number;
    }> = [];

    // Only analyze if we have meaningful conversation (skip single exchanges)
    if (messages.length < 4) return [];

    // Look for meaningful assistant-user interaction patterns
    for (let i = 1; i < messages.length - 1; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1];
      
      // Focus on assistant questions/challenges followed by user responses
      if (currentMsg.role === 'assistant' && nextMsg.role === 'user') {
        const assistantText = currentMsg.text.toLowerCase();
        const userText = nextMsg.text.toLowerCase();
        
        // Get broader context (4 messages around this interaction)
        const contextStart = Math.max(0, i - 2);
        const contextEnd = Math.min(messages.length, i + 3);
        const context = messages.slice(contextStart, contextEnd);
        
        // Skip very short or generic responses
        if (userText.length < 10 || isGenericResponse(userText)) {
          continue;
        }
        
        // Analyze the communication moment
        const moment = analyzeCommunicationMoment(assistantText, userText, nextMsg.id, context);
        if (moment) {
          // Avoid duplicate moments about the same message
          const existingMoment = moments.find(m => m.userMessageId === nextMsg.id);
          if (!existingMoment || moment.significance > existingMoment.significance) {
            if (existingMoment) {
              moments.splice(moments.indexOf(existingMoment), 1);
            }
            moments.push(moment);
          }
        }
      }
    }

    // Sort by significance and return top 3 moments
    return moments
      .sort((a, b) => b.significance - a.significance)
      .filter(m => m.significance > 0.6) // Higher threshold for quality
      .slice(0, 3); // Maximum 3 moments
  };

  const isGenericResponse = (text: string): boolean => {
    const genericPhrases = ['okay', 'yes', 'no', 'sure', 'thanks', 'alright', 'got it', 'yeah'];
    return genericPhrases.some(phrase => text.trim() === phrase);
  };

  const analyzeCommunicationMoment = (
    assistantText: string, 
    userText: string, 
    userMessageId: string,
    context: Message[]
  ) => {
    // Look for patterns that indicate communication choices
    
    // Pattern 1: Specific questions met with vague answers
    const isSpecificQuestion = assistantText.includes('?') && 
      (assistantText.includes('how much') || assistantText.includes('when') || 
       assistantText.includes('what exactly') || assistantText.includes('how many') ||
       assistantText.includes('which') || assistantText.includes('what\'s the'));
       
    const isVagueAnswer = userText.includes('maybe') || userText.includes('around') || 
      userText.includes('roughly') || userText.includes('i think') || userText.includes('probably') ||
      userText.includes('sort of') || userText.includes('kind of') || userText.includes('about');
      
    if (isSpecificQuestion && isVagueAnswer) {
      return {
        userMessageId,
        title: 'Vague answer',
        description: 'You gave an imprecise response when they asked for specifics.',
        type: 'vague_answer' as const,
        significance: 0.9
      };
    }

    // Pattern 2: Accountability when challenged
    const isChallenge = assistantText.includes('what happened') || assistantText.includes('why did') || 
      assistantText.includes('how could') || assistantText.includes('your responsibility') ||
      assistantText.includes('you said you would');
      
    const showsOwnership = userText.includes('i should have') || userText.includes('my mistake') || 
      userText.includes('i was wrong') || userText.includes('i take responsibility') ||
      userText.includes('that\'s on me');
      
    const deflects = userText.includes('but ') || userText.includes('however') || 
      userText.includes('it wasn\'t my') || userText.includes('they didn\'t');
      
    if (isChallenge && showsOwnership && !deflects) {
      return {
        userMessageId,
        title: 'Strong ownership',
        description: 'You acknowledged responsibility without deflecting.',
        type: 'strong_ownership' as const,
        significance: 0.8
      };
    }

    // Pattern 3: Emotional regulation under pressure
    const expressesEmotion = assistantText.includes('upset') || assistantText.includes('angry') || 
      assistantText.includes('frustrated') || assistantText.includes('disappointed') ||
      assistantText.includes('can\'t believe') || assistantText.includes('this is unacceptable');
      
    const staysComposed = !userText.includes('calm down') && !userText.includes('don\'t be') &&
      (userText.includes('understand') || userText.includes('i can see') || 
       userText.includes('let me explain') || userText.includes('i hear'));
       
    if (expressesEmotion && staysComposed) {
      return {
        userMessageId,
        title: 'Stayed calm',
        description: 'You remained composed when they expressed frustration.',
        type: 'stayed_calm' as const,
        significance: 0.8
      };
    }

    // Pattern 4: Acknowledging concerns vs jumping to solutions
    const sharesConcern = assistantText.includes('worried') || assistantText.includes('concerned') || 
      assistantText.includes('i feel') || assistantText.includes('makes me');
      
    const acknowledgesFirst = userText.includes('i understand') || userText.includes('i can see') || 
      userText.includes('that makes sense') || userText.includes('i hear what you\'re saying');
      
    const jumpsStraightToSolution = userText.includes('we can') || userText.includes('let me') || 
      userText.includes('i\'ll fix') || userText.includes('here\'s what we\'ll do');
      
    if (sharesConcern && acknowledgesFirst) {
      return {
        userMessageId,
        title: 'Good acknowledgment',
        description: 'You acknowledged their concern before responding.',
        type: 'acknowledged_concern' as const,
        significance: 0.7
      };
    }
    
    if (sharesConcern && jumpsStraightToSolution && !acknowledgesFirst) {
      return {
        userMessageId,
        title: 'Premature problem-solving',
        description: 'You jumped to solutions before acknowledging their concern.',
        type: 'premature_problem_solving' as const,
        significance: 0.6
      };
    }

    // Pattern 5: Clear, direct communication
    const asksForSomething = assistantText.includes('what do you need') || 
      assistantText.includes('what are you asking');
      
    const makesClearAsk = !isVagueAnswer && (
      userText.includes('i need') || userText.includes('i\'m asking for') || 
      userText.includes('specifically') || userText.includes('exactly'));
      
    if (asksForSomething && makesClearAsk) {
      return {
        userMessageId,
        title: 'Clear ask',
        description: 'You made a direct, specific request.',
        type: 'clear_ask' as const,
        significance: 0.7
      };
    }

    // No significant communication moment found
    return null;
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

  const generateFeedbackReport = async (audioBlob: Blob | null) => {
    if (!sessionId || !session || messages.length === 0) return;
    
    console.log('🎤 GENERATING_FEEDBACK_REPORT', { 
      sessionId, 
      messagesCount: messages.length,
      hasAudio: !!audioBlob 
    });
    
    setIsGeneratingFeedback(true);
    
    try {
      // Step 1: Analyze audio if available
      let audioAnalysis: AudioAnalysis | null = null;
      if (audioBlob) {
        console.log('🎤 ANALYZING_AUDIO');
        audioAnalysis = await audioAnalysisService.analyzeAudio(audioBlob);
      }
      
      // Step 2: Generate combined feedback report
      console.log('🎤 GENERATING_COMBINED_FEEDBACK');
      const feedbackReport = await audioAnalysisService.generateFeedbackReport(
        messages,
        audioAnalysis,
        session.scenario
      );
      
      // Step 3: Store results in the attempt
      const updatedAttempt = sessionStorage.getCurrentAttempt(sessionId);
      if (updatedAttempt && feedbackReport) {
        updatedAttempt.audioAnalysis = audioAnalysis || undefined;
        updatedAttempt.feedbackReport = feedbackReport;
        
        // Update local state
        setCurrentAttempt(updatedAttempt);
        setSession(prev => prev ? {
          ...prev,
          attempts: prev.attempts.map(attempt => 
            attempt.id === prev.currentAttemptId
              ? { ...attempt, audioAnalysis, feedbackReport }
              : attempt
          )
        } : null);
        
        console.log('🎤 FEEDBACK_REPORT_COMPLETE', {
          audioAnalysis: audioAnalysis?.primaryEmotion,
          howYouCameAcross: feedbackReport.howYouCameAcross
        });
      }
      
    } catch (error) {
      console.error('🎤 FEEDBACK_GENERATION_ERROR', error);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const endCurrentAttempt = async () => {
    if (!sessionId) return;
    
    console.log('🔚 ENDING_CURRENT_ATTEMPT', { sessionId });
    
    // End ElevenLabs conversation
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    
    setIsSessionActive(false);
    setConversationState('idle');
    
    // Stop audio recording and process
    let audioBlob: Blob | null = null;
    if (isRecording) {
      audioBlob = await audioRecordingService.stopRecording();
      setIsRecording(false);
    }
    
    // Update attempt status to completed using centralized function
    sessionStorage.endCurrentAttempt(sessionId);
    
    // Store audio recording if available
    if (audioBlob && currentAttempt) {
      // Note: In a real app, you'd store this in a more persistent way
      currentAttempt.audioRecording = audioBlob;
    }
    
    // Update local state
    const updatedSession = sessionStorage.getSession(sessionId);
    const updatedAttempt = sessionStorage.getCurrentAttempt(sessionId);
    
    setSession(updatedSession);
    setCurrentAttempt(updatedAttempt);
    
    // Generate feedback report with audio analysis
    await generateFeedbackReport(audioBlob);
    
    // Then generate annotations (communication moment analysis)
    await generateAnnotations();
  };

  const handleEndConversation = () => {
    endCurrentAttempt();
  };

  const handleViewDebrief = () => {
    if (!sessionId) return;
    navigate(`/debrief/${sessionId}`);
  };

  const handleRunItAgain = () => {
    if (!session || !sessionId) return;
    
    console.log('🔄 CREATING_NEW_ATTEMPT', { sessionId });
    
    // Create a new attempt within the same session
    const newAttempt = sessionStorage.createNewAttempt(sessionId);
    
    if (newAttempt) {
      // Update local state with new attempt
      const updatedSession = sessionStorage.getSession(sessionId);
      setSession(updatedSession);
      setCurrentAttempt(newAttempt);
      setMessages([]);
      setShowKeyMoments(false);
      
      // Reset conversation state for new attempt
      setConversationState('idle');
      setIsSessionActive(false);
      
      // Clear any highlighting
      setHighlightedMessageId(null);
      
      // Auto-start the new conversation attempt
      setTimeout(() => {
        handleStartConversation();
      }, 500);
    }
  };

  const handleBackHome = () => {
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

  const handleScrollToMoment = (messageId: string) => {
    setHighlightedMessageId(messageId);
    const messageElement = document.getElementById(`message-${messageId}`);
    messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Clear highlight after a moment
    setTimeout(() => setHighlightedMessageId(null), 3000);
  };

  const checkForUserDecline = (message: string) => {
    if (!isSessionActive) return;
    
    const lowerMessage = message.toLowerCase().trim();
    const declinePhases = [
      'no, i\'m good',
      'no thanks',
      'i\'m done',
      'that\'s enough',
      'stop',
      'end session',
      'i don\'t want to run it again',
      'no more',
      'i\'m finished',
      'that\'s all'
    ];
    
    const isDecline = declinePhases.some(phrase => lowerMessage.includes(phrase));
    
    if (isDecline) {
      console.log('🛑 USER_DECLINE_DETECTED', { message: lowerMessage });
      
      // Allow brief response time then end
      setTimeout(() => {
        if (isSessionActive) { // Check if still active
          endCurrentAttempt();
        }
      }, 2000); // 2 second delay to allow final agent response
    }
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
    
    // Check for user decline in mock inputs too
    checkForUserDecline(text);
    
    // No live coaching during conversation
    
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
              
              {/* Key moments toggle - only shown after debrief */}
              {currentAttempt?.debriefComplete && currentAttempt.keyMoments.length > 0 && (
                <div className="hidden md:block">
                  <Button
                    onClick={() => setShowKeyMoments(!showKeyMoments)}
                    variant={showKeyMoments ? 'default' : 'outline'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {currentAttempt.keyMoments.length} key moments
                  </Button>
                </div>
              )}
              
              {/* Always show End Call button for active or ending attempts */}
              {currentAttempt && (currentAttempt.status === 'active' || currentAttempt.status === 'ending') ? (
                <Button
                  onClick={handleEndConversation}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  End call
                </Button>
              ) : currentAttempt?.status === 'complete' ? (
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
                    
                    {/* Post-debrief annotation for user messages */}
                    {message.role === 'user' && message.hasAnnotation && currentAttempt?.debriefComplete && (() => {
                      const annotation = currentAttempt.annotations.find(a => a.messageId === message.id);
                      return annotation ? (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className={`ml-4 mr-[30%] mt-2 ${
                            highlightedMessageId === message.id ? 'ring-2 ring-blue-300' : ''
                          }`}
                        >
                          <div className="bg-amber-50 border-l-4 border-amber-200 p-3 rounded-r-lg">
                            <h4 className="text-amber-800 text-sm font-medium">{annotation.title}</h4>
                            <p className="text-sm text-amber-700 mt-1">{annotation.body}</p>
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

          {/* Post-debrief completion state */}
          {currentAttempt?.status === 'complete' && (
            <div className="border-t border-border bg-slate-50 p-6">
              <div className="max-w-md mx-auto text-center">
                {isGeneratingFeedback ? (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Mic className="w-3 h-3 text-white animate-pulse" />
                    </div>
                    <h3 className="text-lg font-medium">Analyzing your delivery...</h3>
                  </div>
                ) : !currentAttempt.debriefComplete ? (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">⏱</span>
                    </div>
                    <h3 className="text-lg font-medium">Finishing debrief...</h3>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <h3 className="text-lg font-medium">
                        Attempt {currentAttempt.attemptNumber} Complete
                      </h3>
                    </div>
                    
                    {currentAttempt.keyMoments.length > 0 && (
                      <div className="mb-6">
                        <p className="text-sm text-slate-600 mb-3">
                          {currentAttempt.keyMoments.length} key moments from this rehearsal
                        </p>
                        <div className="space-y-2">
                          {currentAttempt.keyMoments.map((moment) => (
                            <button
                              key={moment.id}
                              onClick={() => handleScrollToMoment(moment.messageId)}
                              className="block w-full text-left p-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                            >
                              <div className="font-medium text-sm text-slate-800">{moment.label}</div>
                              <div className="text-xs text-slate-600">{moment.summary}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3">
                      {currentAttempt.feedbackReport && (
                        <Button
                          onClick={handleViewDebrief}
                          variant="default"
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          View Feedback Report
                        </Button>
                      )}
                      
                      <Button
                        onClick={handleRunItAgain}
                        variant={currentAttempt.feedbackReport ? "outline" : "default"}
                        size="sm"
                        className={currentAttempt.feedbackReport ? "w-full" : "w-full bg-blue-600 hover:bg-blue-700"}
                      >
                        Run it again
                      </Button>
                      
                      <div className="flex gap-3">
                        {currentAttempt.keyMoments.length > 0 && (
                          <Button
                            onClick={() => setShowKeyMoments(!showKeyMoments)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Review moments
                          </Button>
                        )}
                        <Button
                          onClick={handleBackHome}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Back home
                        </Button>
                      </div>
                    </div>
                  </>
                )}
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
                {/* Dev-only test for annotations */}
                {import.meta.env.DEV && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={generateAnnotations}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      🧪 Test Annotations
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => generateFeedbackReport(null)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      🧪 Test Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => checkForUserDecline("No, I'm good")}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🧪 Test Decline
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Old coach panel removed - replaced with post-debrief annotations */}
      </div>
    </div>
  );
}
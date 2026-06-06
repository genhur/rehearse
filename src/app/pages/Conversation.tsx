import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams, useOutletContext } from 'react-router';
import { Button } from '../components/Button';
import { AppHeader } from '../components/AppHeader';
import { FeedbackRail } from '../components/FeedbackRail';
import { getSession, updateSession, sessionManager, getCurrentAttempt, getSetupConversation, updateSetupConversation, commitSetupToSession, type RehearsalSession, type RehearsalAttempt, type SetupConversation, type TranscriptTurn, type AudioAnalysis, type FeedbackReport } from '../../../lib/sessions';
import { SimpleVoiceOrb } from '../components/SimpleVoiceOrb';
import { Conversation as ElevenLabsConversation } from '@11labs/client';
import type { Mode, Status } from '@11labs/client';
import { Phone, PhoneOff, Play, Mic, MessageSquare } from 'lucide-react';
import { audioRecordingService, audioAnalysisService } from '../../../lib/audio-analysis';

const AGENT_ID = 'agent_4901ktej496kfp1a1kwj03q037ey';

type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface OutletContext {
  openHistoryPanel: () => void;
  isHistoryPanelOpen: boolean;
}

export function Conversation() {
  const navigate = useNavigate();
  const { sessionId, setupId } = useParams<{ sessionId?: string; setupId?: string }>();
  const { openHistoryPanel } = useOutletContext<OutletContext>();
  const [session, setSession] = useState<RehearsalSession | null>(null);
  const [setupConversation, setSetupConversation] = useState<SetupConversation | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<RehearsalAttempt | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [elevenLabsMode, setElevenLabsMode] = useState<Mode>('listening');
  const [highlightedTurnId, setHighlightedTurnId] = useState<string | null>(null);
  const [showKeyMoments, setShowKeyMoments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<ElevenLabsConversation | null>(null);

  // Helper to determine if a call is currently active
  const isCallActive = (): boolean => {
    // Setup conversations are never "active calls"
    if (setupConversation) return false;
    
    const currentAttemptData = getCurrentAttempt(session);
    return session?.status === 'active' && 
           currentAttemptData?.status === 'active';
  };

  useEffect(() => {
    console.log('CONVERSATION_PAGE_MOUNTED', { sessionId, setupId });
    
    // Handle setup conversation
    if (setupId) {
      const setupData = getSetupConversation(setupId);
      if (!setupData) {
        navigate('/');
        return;
      }
      
      setSetupConversation(setupData);
      setSession(null);
      setCurrentAttempt(null);
      setTranscript(setupData.clarificationTranscript);
      
      // Add initial message if no transcript yet
      if (setupData.clarificationTranscript.length === 0) {
        const initialTurn = sessionManager.addSetupTranscriptTurn(
          setupId,
          'agent',
          setupData.scenarioDraft === 'What difficult conversation are you avoiding today?' 
            ? 'What conversation do you need to rehearse?'
            : 'Let me ask you a few questions to help set up this roleplay scenario.'
        );
        setTranscript([initialTurn]);
        
        // Auto-start conversation for setup
        setTimeout(() => {
          handleStartConversation();
        }, 1000);
      }
      return;
    }

    // Handle regular session
    if (!sessionId) {
      navigate('/');
      return;
    }

    const sessionData = getSession(sessionId);
    if (!sessionData) {
      navigate('/');
      return;
    }

    setSession(sessionData);
    setSetupConversation(null);
    
    // Get current attempt using the helper function
    const currentAttemptData = getCurrentAttempt(sessionData);
    setCurrentAttempt(currentAttemptData);
    setTranscript(currentAttemptData ? currentAttemptData.transcript : []);
    
    // Add initial intake message if this is a new session with no transcript
    if (sessionData.scenario === 'What difficult conversation are you avoiding today?' && 
        (!currentAttemptData || currentAttemptData.transcript.length === 0)) {
      const initialTurn = sessionManager.addTranscriptTurn(
        sessionId,
        'agent',
        'What conversation do you need to rehearse?'
      );
      setTranscript([initialTurn]);
      
      // Auto-start conversation immediately
      setTimeout(() => {
        handleStartConversation();
      }, 500);
    }
  }, [sessionId, setupId, navigate]);

  useEffect(() => {
    // Scroll to bottom when new transcript turns arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

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
          // Add transcript turn to session storage
          const speaker = source === 'user' ? 'user' : 'agent';
          const newTurn = sessionManager.addTranscriptTurn(sessionId, speaker, message);
          setTranscript(prev => [...prev, newTurn]);
          console.log('📝 TRANSCRIPT_TURN_ADDED', { 
            speaker, 
            turnId: newTurn.id, 
            text: message,
            sessionId 
          });
          
          // Check for user decline phrases
          if (speaker === 'user') {
            checkForUserDecline(message);
          }
          
          // No live coaching during active conversation
          
          // Handle intake flow progression
          if (speaker === 'user' && (
            (session?.scenario === 'What difficult conversation are you avoiding today?') ||
            (setupConversation?.scenarioDraft === 'What difficult conversation are you avoiding today?')
          )) {
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
    // Handle setup conversation updates
    if (setupConversation && setupId) {
      const updatedSetup = {
        ...setupConversation,
        scenarioDraft: userMessage
      };
      
      updateSetupConversation(updatedSetup);
      setSetupConversation(updatedSetup);
      
      console.log('[Conversation] Updated setup conversation with user scenario:', { 
        scenario: userMessage 
      });
      
      // Check if we have enough information to commit to a session
      // For now, commit after the user provides their scenario
      if (updatedSetup.clarificationTranscript.length >= 2 && // At least one exchange
          userMessage !== 'What difficult conversation are you avoiding today?' &&
          userMessage.length > 10) { // User provided meaningful scenario
        
        console.log('[Conversation] Setup ready to commit to session');
        
        // Mark setup as ready and commit in next AI response
        const readySetup = { ...updatedSetup, isReadyToStart: true };
        updateSetupConversation(readySetup);
        setSetupConversation(readySetup);
      }
      
      return;
    }
    
    // Legacy handling for existing sessions (this shouldn't happen with new flow)
    if (!sessionId || !session) return;
    
    // Update session with the user's scenario
    const updatedSession = { 
      ...session, 
      scenario: userMessage,
      title: userMessage.length > 50 ? userMessage.substring(0, 47) + '...' : userMessage
    };
    
    updateSession(updatedSession);
    setSession(updatedSession);
    
    console.log('[Conversation] Updated session with user scenario:', { 
      scenario: userMessage,
      title: updatedSession.title 
    });
  };

  const commitSetupToSessionAndRedirect = async () => {
    if (!setupConversation || !setupId) return;
    
    try {
      console.log('[Conversation] Committing setup to session:', setupConversation);
      
      // Commit the setup conversation to a real session
      const newSession = commitSetupToSession(setupId);
      
      console.log('[Conversation] Created session from setup:', newSession.id);
      
      // Navigate to the new session
      navigate(`/conversation/${newSession.id}`);
    } catch (error) {
      console.error('[Conversation] Failed to commit setup to session:', error);
    }
  };

  const generateFeedbackReport = async (audioBlob: Blob | null) => {
    if (!sessionId || !session || transcript.length === 0) return;
    
    console.log('🎤 GENERATING_FEEDBACK_REPORT', { 
      sessionId, 
      transcriptLength: transcript.length,
      hasAudio: !!audioBlob 
    });
    
    setIsGeneratingFeedback(true);
    
    try {
      // Convert transcript to message format for audio analysis service
      const messages = transcript.map(turn => ({
        id: turn.id,
        sessionId,
        role: turn.speaker === 'user' ? 'user' as const : 'assistant' as const,
        text: turn.text,
        timestamp: new Date(turn.timestamp).getTime()
      }));
      
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
      if (feedbackReport) {
        sessionManager.completeAttempt(sessionId, feedbackReport, audioAnalysis || undefined);
        
        // Update local state
        const updatedSession = getSession(sessionId);
        const updatedAttempt = getCurrentAttempt(updatedSession);
        
        setSession(updatedSession);
        setCurrentAttempt(updatedAttempt);
        
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
    
    // Generate feedback report with audio analysis
    await generateFeedbackReport(audioBlob);
    
    // Update session status to completed
    if (session) {
      session.status = 'complete';
      updateSession(session);
    }
    
    // Update local state
    const updatedSession = getSession(sessionId);
    const updatedAttempt = getCurrentAttempt(updatedSession);
    
    setSession(updatedSession);
    setCurrentAttempt(updatedAttempt);
  };

  const handleEndConversation = () => {
    endCurrentAttempt();
  };

  const handleViewFeedback = () => {
    setIsFeedbackOpen(true);
  };

  const handleCloseFeedback = () => {
    setIsFeedbackOpen(false);
  };

  const handleJumpToMoment = (turnId: string) => {
    setHighlightedTurnId(turnId);
    const turnElement = document.getElementById(`turn-${turnId}`);
    turnElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Clear highlight after a moment
    setTimeout(() => setHighlightedTurnId(null), 3000);
  };

  const handleRunItAgain = () => {
    if (!session || !sessionId) return;
    
    console.log('🔄 CREATING_NEW_ATTEMPT', { sessionId });
    
    // Create a new attempt within the same session
    const newAttempt = sessionManager.createNewAttempt(sessionId);
    
    if (newAttempt) {
      // Update local state with new attempt
      const updatedSession = getSession(sessionId);
      setSession(updatedSession);
      setCurrentAttempt(newAttempt);
      setTranscript([]);
      setShowKeyMoments(false);
      setIsFeedbackOpen(false); // Close feedback rail
      
      // Reset conversation state for new attempt
      setConversationState('idle');
      setIsSessionActive(false);
      
      // Clear any highlighting
      setHighlightedTurnId(null);
      
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

  const handleScrollToMoment = (turnId: string) => {
    setHighlightedTurnId(turnId);
    const turnElement = document.getElementById(`turn-${turnId}`);
    turnElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Clear highlight after a moment
    setTimeout(() => setHighlightedTurnId(null), 3000);
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
    if (!session || transcript.length === 0) return '0s';
    
    const firstTurn = transcript[0];
    const lastTurn = transcript[transcript.length - 1];
    const durationMs = new Date(lastTurn.timestamp).getTime() - new Date(firstTurn.timestamp).getTime();
    
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
      const aiTurn = sessionManager.addTranscriptTurn(
        sessionId,
        'agent',
        `Hi there! I understand you wanted to discuss ${session?.scenario.toLowerCase()}. I appreciate you making time for this important conversation. How are you feeling about this topic?`
      );
      setTranscript(prev => [...prev, aiTurn]);
      setConversationState('listening');
    }, 2000);
  };

  const handleMockUserInput = (text: string) => {
    let userTurn;
    
    // Handle setup conversations vs regular sessions
    if (setupConversation && setupId) {
      userTurn = sessionManager.addSetupTranscriptTurn(setupId, 'user', text);
      setTranscript(prev => [...prev, userTurn]);
    } else if (sessionId) {
      userTurn = sessionManager.addTranscriptTurn(sessionId, 'user', text);
      setTranscript(prev => [...prev, userTurn]);
    } else {
      return; // No valid session or setup
    }
    
    console.log('📝 TRANSCRIPT_TURN_ADDED (MOCK)', { 
      turnId: userTurn.id, 
      text,
      sessionId 
    });
    
    // Check for user decline in mock inputs too
    checkForUserDecline(text);
    
    // No live coaching during conversation
    
    // Handle intake response for mock too
    if ((session?.scenario === 'What difficult conversation are you avoiding today?') ||
        (setupConversation?.scenarioDraft === 'What difficult conversation are you avoiding today?')) {
      handleIntakeResponse(text);
    }
    
    setConversationState('thinking');
    
    // Mock AI response
    setTimeout(() => {
      let responses: string[];
      
      if ((session?.scenario === 'What difficult conversation are you avoiding today?') ||
          (setupConversation?.scenarioDraft === 'What difficult conversation are you avoiding today?')) {
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
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Handle setup conversations vs regular sessions
      if (setupConversation && setupId) {
        const aiTurn = sessionManager.addSetupTranscriptTurn(setupId, 'agent', response);
        setTranscript(prev => [...prev, aiTurn]);
        
        // Check if setup is ready to transition to session
        if (setupConversation.isReadyToStart) {
          console.log('[Conversation] Setup is ready, will transition after this response');
          // Transition after a short delay to let user see the response
          setTimeout(() => {
            commitSetupToSessionAndRedirect();
          }, 2000);
        }
      } else if (sessionId) {
        const aiTurn = sessionManager.addTranscriptTurn(sessionId, 'agent', response);
        setTranscript(prev => [...prev, aiTurn]);
      }
      
      setConversationState('listening');
    }, 1500);
  };

  if (!session && !setupConversation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => navigate('/')}>Back home</Button>
        </div>
      </div>
    );
  }

  const getSessionTitle = (): string => {
    // Handle setup conversations
    if (setupConversation) {
      if (setupConversation.scenarioDraft && setupConversation.scenarioDraft !== 'What difficult conversation are you avoiding today?') {
        return setupConversation.scenarioDraft.length > 50 ? setupConversation.scenarioDraft.substring(0, 47) + '...' : setupConversation.scenarioDraft;
      }
      return 'Setup Conversation';
    }
    
    if (!session) return 'Loading...';
    
    // Use the generated title if it's not the default intake question
    if (session.title && session.title !== 'What difficult conversation are you avoiding today?') {
      return session.title;
    }
    
    // Use scenario if available
    if (session.scenario && session.scenario !== 'What difficult conversation are you avoiding today?') {
      return session.scenario.length > 50 ? session.scenario.substring(0, 47) + '...' : session.scenario;
    }
    
    return 'Conversation Practice';
  };

  const getSessionSubtitle = (): string | undefined => {
    // Handle setup conversations
    if (setupConversation) {
      if (setupConversation.scenarioDraft === 'What difficult conversation are you avoiding today?') {
        return 'Tell Rehearse what conversation you need to practice.';
      }
      return 'Setting up your roleplay scenario.';
    }
    
    if (!session) return undefined;
    
    // If this is the intake phase, show helper text
    if (session.scenario === 'What difficult conversation are you avoiding today?') {
      return 'Tell Rehearse what conversation you need to practice.';
    }
    
    // Show conversation partner info
    if (session.characterName && session.characterRole) {
      return `Practice with ${session.characterName} · ${session.characterRole}`;
    } else if (session.characterRole) {
      return `Conversation with ${session.characterRole}`;
    }
    
    return 'Conversation practice';
  };

  const getSessionStatus = (): 'active' | 'complete' | 'idle' => {
    if (isSessionActive) return 'active';
    if (currentAttempt?.status === 'complete') return 'complete';
    return 'idle';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ '--header-height': '137px' } as React.CSSProperties}>
      {/* App Header */}
      <AppHeader
        title={getSessionTitle()}
        subtitle={getSessionSubtitle()}
        status={getSessionStatus()}
        showHomeButton={false}
        showHistoryButton={true}
        onHistoryClick={openHistoryPanel}
      />

      {/* Session Controls Bar */}
      {(isSessionActive || currentAttempt?.status === 'complete') && (
        <div className="border-b border-border bg-muted/20 px-6 py-3">
          <div className="flex items-center justify-between max-w-full mx-auto">
            <div className="flex items-center gap-4">
              {/* Voice state indicator */}
              {isSessionActive && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: conversationState === 'idle' ? '#6b7280' : conversationState === 'listening' ? '#10b981' : conversationState === 'thinking' ? '#f59e0b' : '#3b82f6' }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {conversationState === 'idle' ? 'Ready to start' : conversationState === 'listening' ? 'Listening...' : conversationState === 'thinking' ? 'Thinking...' : 'Speaking...'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Show End Call button for active sessions and attempts */}
              {(isCallActive() || currentAttempt?.status === 'ending') ? (
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
                  <div className="text-xs text-muted-foreground">
                    Duration: {calculateDuration()} · {transcript.length} messages
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Main content with flex layout */}
      <div className="flex-1 flex">
        {/* Conversation area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          isFeedbackOpen ? 'mr-0' : ''
        }`}>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            {transcript.length === 0 ? (
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
              <div className={`max-w-4xl mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-3xl' : 'max-w-4xl'
              }`}>
                {/* Transcript format */}
                <div className="space-y-1">
                  {transcript.map((turn) => (
                    <motion.div
                      key={turn.id}
                      id={`turn-${turn.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 rounded-lg transition-all duration-300 ${
                        highlightedTurnId === turn.id
                          ? 'bg-amber-100/80 border border-amber-200'
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="font-medium text-sm text-gray-700 w-16 flex-shrink-0">
                          {turn.speaker === 'user' ? 'You' : turn.speakerName}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed text-gray-900">
                            {turn.speaker === 'agent' ? cleanAssistantText(turn.text) : turn.text}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Conversation completion bar */}
          {currentAttempt?.status === 'complete' && !isGeneratingFeedback && (
            <div className="border-t border-border bg-card/50 p-4">
              <div className={`mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-3xl' : 'max-w-4xl'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <span className="font-medium text-sm">Simulation complete</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {currentAttempt.feedbackReport && (
                      <Button
                        onClick={handleViewFeedback}
                        variant="default"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        View Feedback
                      </Button>
                    )}
                    <Button
                      onClick={handleRunItAgain}
                      variant="outline"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Run it again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generating feedback state */}
          {isGeneratingFeedback && (
            <div className="border-t border-border bg-card/50 p-4">
              <div className={`mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-3xl' : 'max-w-4xl'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Mic className="w-3 h-3 text-white animate-pulse" />
                  </div>
                  <span className="text-sm font-medium">Analyzing your delivery...</span>
                </div>
              </div>
            </div>
          )}

          {/* Voice interaction area */}
          {isSessionActive && (
            <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
              <div className={`max-w-4xl mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-3xl' : 'max-w-4xl'
              }`}>
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
                        onClick={() => {
                          setIsFeedbackOpen(!isFeedbackOpen);
                          console.log('🧪 TOGGLING_FEEDBACK_RAIL', { isOpen: !isFeedbackOpen });
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        🧪 Toggle Rail
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
            </div>
          )}
        </div>

        {/* Feedback Rail */}
        {isFeedbackOpen && currentAttempt?.feedbackReport && (
          <div className="w-2/5 min-w-[400px] max-w-[500px]">
            <FeedbackRail
              report={currentAttempt.feedbackReport}
              audioAnalysis={currentAttempt.audioAnalysis}
              isOpen={isFeedbackOpen}
              onClose={handleCloseFeedback}
              onJumpToMoment={handleJumpToMoment}
              onRunAgain={handleRunItAgain}
            />
          </div>
        )}
      </div>
    </div>
  );
}
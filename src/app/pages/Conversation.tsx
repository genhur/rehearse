import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useOutletContext } from 'react-router';
import { Button } from '../components/Button';
import { FeedbackRail } from '../components/FeedbackRail';
import { getSession, sessionManager, getCurrentAttempt, getSetupConversation, updateSetupConversation, commitSetupToSession, endCurrentAttempt as endSessionAttempt, type RehearsalSession, type RehearsalAttempt, type SetupConversation, type TranscriptTurn, type AudioAnalysis, type FeedbackReport, type RehearsalPhase } from '../../../lib/sessions';
import { Conversation as ElevenLabsConversation } from '@11labs/client';
import type { Mode, Status } from '@11labs/client';
import { Phone, Play, Mic } from 'lucide-react';
import { audioRecordingService, audioAnalysisService } from '../../../lib/audio-analysis';
import { UserSpeechBubble } from '../components/UserSpeechBubble';
import { UserActivityIndicator } from '../components/UserActivityIndicator';
import { SystemActivityIndicator } from '../components/SystemActivityIndicator';
import { StatusLabel } from '../components/StatusLabel';
import { ViewFeedbackButton } from '../components/ViewFeedbackButton';
import { EndCallButton } from '../components/EndCallButton';
import { NavigationIcon } from '../components/NavigationIcon';

const AGENT_ID = 'agent_4901ktej496kfp1a1kwj03q037ey';

type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface OutletContext {
  openHistoryPanel: () => void;
  isHistoryPanelOpen: boolean;
}

export function Conversation() {
  const navigate = useNavigate();
  const params = useParams<{ sessionId?: string; setupId?: string }>();
  const { sessionId, setupId } = params;
  const { openHistoryPanel } = useOutletContext<OutletContext>();
  
  console.log('🚀 SETUP: Conversation component params', { params, sessionId, setupId });
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
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    console.log('🚀 SETUP: CONVERSATION_PAGE_MOUNTED', { sessionId, setupId });
    
    // Handle setup conversation
    if (setupId) {
      const setupData = getSetupConversation(setupId);
      if (!setupData) {
        console.trace('NAVIGATE_HOME_CALLED: Setup conversation not found');
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
      console.log('🚀 SETUP: No sessionId, redirecting to home');
      console.trace('NAVIGATE_HOME_CALLED: No sessionId in useEffect');
      navigate('/');
      return;
    }

    console.log('🚀 SETUP: Loading session', { sessionId });
    
    const sessionData = getSession(sessionId);
    if (!sessionData) {
      console.error('🚀 SETUP: Session not found, redirecting to home', { sessionId });
      // Don't navigate if we're in the middle of completion
      if (window.location.pathname.includes('/conversation/')) {
        console.log('🚀 SETUP: In conversation page, not navigating away');
        return;
      }
      console.trace('NAVIGATE_HOME_CALLED: Session not found in useEffect');
      navigate('/');
      return;
    }

    console.log('🚀 SETUP: Session found', { sessionData });

    setSession(sessionData);
    setSetupConversation(null);
    
    // Get current attempt using the helper function
    const currentAttemptData = getCurrentAttempt(sessionData);
    setCurrentAttempt(currentAttemptData);
    setTranscript(currentAttemptData ? currentAttemptData.transcript : []);
    
    console.log('🚀 SETUP: Session state set', { 
      phase: sessionData.phase, 
      status: sessionData.status,
      currentAttempt: currentAttemptData 
    });
    
    // Initialize isSessionActive for simulation sessions with active status
    if (sessionData.phase === 'simulation' && 
        (sessionData.status === 'active' || currentAttemptData?.status === 'active')) {
      console.log('🚀 SETUP: Setting isSessionActive=true for active simulation session');
      setIsSessionActive(true);
      
      // If session has existing transcript, don't auto-start conversation
      if (currentAttemptData?.transcript && currentAttemptData.transcript.length > 0) {
        console.log('🚀 SETUP: Session has existing transcript, not auto-starting');
        setConversationState('idle'); // Set to idle since conversation is not currently active
      }
    }
    
    // Auto-start simulation phase sessions that don't have transcript yet
    if (sessionData.phase === 'simulation' && 
        currentAttemptData?.status === 'active' &&
        (!currentAttemptData.transcript || currentAttemptData.transcript.length === 0)) {
      console.log('🚀 SETUP: Auto-starting simulation phase session');
      setTimeout(() => {
        console.log('🚀 SETUP: Auto-start timeout complete, calling handleStartConversation');
        handleStartConversation();
      }, 500);
    }
  }, [sessionId, setupId, navigate]);

  useEffect(() => {
    // Scroll to bottom when new transcript turns arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      clearInactivityTimeout();
    };
  }, []);

  const handleStartConversation = async () => {
    console.log("VOICE: orb clicked", { sessionId, setupId, mode: sessionId ? 'simulation' : 'setup' });
    
    // Support both regular sessions and setup conversations
    if (!sessionId && !setupId) {
      console.error("VOICE: No sessionId or setupId, cannot start");
      return;
    }
    
    console.log("VOICE: setting UI to active state");
    setIsSessionActive(true);
    
    // Don't set to listening until we verify mic access
    setConversationState('thinking');
    console.log("VOICE: initial state set to thinking, will change to listening after mic verification");
    
    // Start inactivity timeout
    startInactivityTimeout();
    
    console.log("MIC_PERMISSION_REQUESTED");
    
    // Check microphone permissions first
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log("VOICE: microphone permission status", permissionStatus.state);
      
      if (permissionStatus.state === 'granted') {
        console.log("MIC_PERMISSION_GRANTED");
      } else if (permissionStatus.state === 'denied') {
        console.log("MIC_PERMISSION_DENIED");
      }
    } catch (permError) {
      console.warn("VOICE: could not check microphone permission", permError);
    }
    
    // Test getUserMedia directly
    try {
      console.log("VOICE: testing getUserMedia access");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("VOICE: getUserMedia successful", { tracks: stream.getAudioTracks().length });
      
      // Check if tracks are active
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`VOICE: audio track ${index}`, { 
          enabled: track.enabled, 
          readyState: track.readyState,
          label: track.label 
        });
      });
      
      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());
      console.log("VOICE: getUserMedia test stream cleaned up");
      
    } catch (getUserMediaError) {
      console.error("USER_AUDIO_INPUT_ERROR: getUserMedia failed", getUserMediaError);
      console.error("MIC_PERMISSION_DENIED: getUserMedia access denied");
    }
    
    console.log("VOICE: starting audio recording service");
    // Start audio recording
    const recordingStarted = await audioRecordingService.startRecording();
    if (recordingStarted) {
      setIsRecording(true);
      console.log("VOICE: audio recording started successfully");
    } else {
      console.error("VOICE: audio recording failed to start");
    }
    
    try {
      console.log("VOICE: starting ElevenLabs session", { agentId: AGENT_ID, mode: sessionId ? 'simulation' : 'setup' });
      
      const conversation = await ElevenLabsConversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          console.log('ELEVENLABS_SESSION_STARTED');
          console.log('VOICE: ElevenLabs connected successfully');
        },
        onDisconnect: () => {
          console.log('VOICE: ElevenLabs disconnected');
          conversationRef.current = null;
          setIsSessionActive(false);
          setConversationState('idle');
        },
        onError: (message) => {
          console.error('VOICE: ElevenLabs error:', message);
          console.error('USER_AUDIO_INPUT_ERROR: ElevenLabs session error', message);
          setIsSessionActive(false);
          setConversationState('idle');
        },
        onModeChange: ({ mode }) => {
          console.log('VOICE: ElevenLabs mode changed to', mode);
          
          // Log specifically when entering listening mode (mic should be active)
          if (mode === 'listening') {
            console.log('VOICE: ElevenLabs confirms listening mode - mic input should be active');
            console.log('VOICE: setting UI to listening state');
          } else if (mode === 'speaking') {
            console.log('VOICE: ElevenLabs speaking - mic input temporarily disabled');
          }
          
          setElevenLabsMode(mode);
          setConversationState(mode === 'listening' ? 'listening' : mode === 'speaking' ? 'speaking' : 'thinking');
        },
        onMessage: ({ message, source }) => {
          console.log('VOICE: message received', { message, source, messageLength: message.length });
          
          if (source === 'user') {
            console.log('USER_TRANSCRIPT_EVENT: user spoke', message);
            console.log('VOICE: user transcript:', message);
          } else {
            console.log('VOICE: agent response:', message);
          }
          // Reset inactivity timeout on any message
          startInactivityTimeout();
          
          // Add transcript turn to session storage
          const speaker = source === 'user' ? 'user' : 'agent';
          
          let newTurn;
          if (sessionId) {
            console.log('VOICE: adding transcript to session', { sessionId, speaker });
            newTurn = sessionManager.addTranscriptTurn(sessionId, speaker, message);
          } else if (setupId) {
            console.log('VOICE: adding transcript to setup conversation', { setupId, speaker });
            newTurn = sessionManager.addSetupTranscriptTurn(setupId, speaker, message);
          } else {
            console.error('VOICE: no sessionId or setupId to add transcript to');
            return;
          }
          
          setTranscript(prev => [...prev, newTurn]);
          console.log('VOICE: transcript turn added', { 
            speaker, 
            turnId: newTurn.id, 
            text: message,
            sessionId,
            setupId
          });
          
          // Check for user decline phrases
          if (speaker === 'user') {
            checkForUserDecline(message);
          }
          
          // Natural ending detection removed - users control via End Call button
          
          // Check for user readiness to start simulation in setup conversations
          if (speaker === 'user' && setupConversation) {
            checkForSimulationReadiness(message);
          }
          
          // No live coaching during active conversation
          
          // Handle intake flow progression (setup conversations only)
          if (speaker === 'user' && 
              setupConversation?.scenarioDraft === 'What difficult conversation are you avoiding today?') {
            handleIntakeResponse(message);
          }
        }
      });
      
      conversationRef.current = conversation;
      console.log("VOICE: session started successfully", conversation);
      
      // Check if conversation is properly configured for input
      console.log("VOICE: checking conversation configuration", {
        conversationObject: !!conversation,
        hasOnMessage: !!conversation.onMessage,
        hasOnModeChange: !!conversation.onModeChange
      });
      
      // Check if conversation is immediately ready for input
      setTimeout(() => {
        console.log("VOICE: conversation status after 1 second", {
          isListening: conversationState === 'listening',
          elevenLabsMode,
          conversationState,
          isSessionActive
        });
        
        if (conversationState === 'listening') {
          console.log("VOICE: UI shows listening - mic should be capturing audio");
        } else {
          console.log("VOICE: UI not in listening state - mic may not be active");
        }
      }, 1000);
    } catch (error) {
      console.error('VOICE: start failed', error);
      console.error('VOICE: error details', {
        errorMessage: error.message,
        errorStack: error.stack,
        agentId: AGENT_ID
      });
      
      setIsSessionActive(false);
      setConversationState('idle');
      
      // Fallback to mock conversation for testing
      console.log("VOICE: falling back to mock conversation");
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
      
      // Setup transition now handled by explicit user confirmation or Start simulation button
      // No automatic transition based on transcript length
      
      return;
    }
    
    // Sessions should not handle intake - this is now only for setup conversations
    console.log('[Conversation] WARNING: Session received intake response, but intake should only happen in setup conversations');
  };

  const startSimulationFromSetup = async () => {
    console.log('🚀 SETUP: startSimulationFromSetup called');
    
    if (!setupConversation || !setupId) {
      console.error('🚀 SETUP: missing setupConversation or setupId', { setupConversation, setupId });
      return;
    }
    
    try {
      console.log('🚀 SETUP: extracting user scenario');
      
      // Extract the scenario from the user's transcript
      const userScenario = getUserScenarioFromTranscript(setupConversation.clarificationTranscript);
      
      if (!userScenario || userScenario.length < 10) {
        console.error('🚀 SETUP: No valid scenario found', { scenario: userScenario });
        return;
      }
      
      console.log('🚀 SETUP: scenario extracted successfully', { scenario: userScenario });
      
      // Extract character information from the scenario
      const characterInfo = extractCharacterFromScenario(userScenario);
      console.log('🚀 SETUP: character info extracted', characterInfo);
      
      // Create the setup conversation with the extracted scenario and character info
      const updatedSetup = {
        ...setupConversation,
        scenarioDraft: userScenario,
        characterRole: characterInfo.role,
        characterName: characterInfo.name,
        isReadyToStart: true
      };
      
      console.log('🚀 SETUP: updating setup conversation');
      updateSetupConversation(updatedSetup);
      
      console.log('🚀 SETUP: calling commitSetupToSession');
      
      // Commit the setup conversation to a real session
      const newSession = commitSetupToSession(setupId);
      
      console.log('🚀 SETUP: session created', { sessionId: newSession.id, session: newSession });
      
      console.log('🚀 SETUP: navigation starting');
      
      const targetUrl = `/conversation/${newSession.id}`;
      console.log('🚀 SETUP: navigating to URL', { targetUrl });
      
      // Navigate to the new session - it will auto-start since it's a simulation phase session
      navigate(targetUrl);
      
      console.log('🚀 SETUP: navigate() function called');
      
    } catch (error) {
      console.error('🚀 SETUP: Failed to start simulation from setup:', error);
    }
  };

  // Helper function to extract user scenario from transcript
  const getUserScenarioFromTranscript = (transcript: TranscriptTurn[]): string => {
    // Find the first substantial user response that isn't the initial question
    for (const turn of transcript) {
      if (turn.speaker === 'user' && 
          turn.text !== 'What difficult conversation are you avoiding today?' &&
          turn.text.length > 10) {
        return turn.text;
      }
    }
    return '';
  };

  // Helper function to extract character information from scenario text
  const extractCharacterFromScenario = (scenario: string): { name: string; role: string } => {
    const lowerScenario = scenario.toLowerCase();
    
    // Common relationship patterns
    const patterns = [
      { pattern: /(?:my )?cofounder|co-founder/, role: 'Co-founder', name: 'Alex' },
      { pattern: /(?:my )?manager|boss|supervisor/, role: 'Manager', name: 'Manager' },
      { pattern: /(?:my )?partner|boyfriend|girlfriend|spouse/, role: 'Partner', name: 'Partner' },
      { pattern: /(?:my )?employee|team member|subordinate/, role: 'Team Member', name: 'Team Member' },
      { pattern: /(?:my )?client|customer/, role: 'Client', name: 'Client' },
      { pattern: /(?:my )?investor/, role: 'Investor', name: 'Investor' },
      { pattern: /(?:my )?parent|mother|father|mom|dad/, role: 'Parent', name: 'Parent' },
      { pattern: /(?:my )?friend/, role: 'Friend', name: 'Friend' },
      { pattern: /(?:my )?roommate/, role: 'Roommate', name: 'Roommate' },
    ];
    
    for (const { pattern, role, name } of patterns) {
      if (pattern.test(lowerScenario)) {
        return { role, name };
      }
    }
    
    // Default fallback
    return { role: 'Conversation Partner', name: 'Alex' };
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
      console.log('🔍 MAIN_FEEDBACK_AUDIT', {
        messageCount: messages.length,
        userMessageCount: messages.filter(m => m.role === 'user').length,
        scenario: session.scenario,
        messages: messages.map(m => ({ role: m.role, text: m.text }))
      });
      
      const feedbackReport = await audioAnalysisService.generateFeedbackReport(
        messages,
        audioAnalysis,
        session.scenario
      );
      
      console.log('🔍 FEEDBACK_RESULT_AUDIT', { 
        feedbackGenerated: !!feedbackReport,
        feedbackReport 
      });
      
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

  const hasInsufficientData = (transcript: any[]): boolean => {
    const userTurns = transcript.filter(turn => turn.speaker === 'user');
    const totalUserWords = userTurns.reduce((count, turn) => {
      return count + turn.text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    
    console.log('🔍 DATA_SUFFICIENCY_CHECK', {
      userTurnCount: userTurns.length,
      totalUserWords,
      meetsMinimumTurns: userTurns.length >= 3,
      meetsMinimumWords: totalUserWords >= 100
    });
    
    return userTurns.length < 3 || totalUserWords < 100;
  };

  const generateEvidenceBasedFeedback = (): any => {
    const userTurns = transcript.filter(turn => turn.speaker === 'user');
    
    console.log('🔍 EVIDENCE_BASED_FEEDBACK_GENERATION', {
      transcriptLength: transcript.length,
      userTurnCount: userTurns.length,
      transcript: transcript.map(t => ({ id: t.id, speaker: t.speaker, text: t.text }))
    });
    
    // Check for insufficient data
    if (hasInsufficientData(transcript)) {
      return {
        overallAssessment: "Not enough conversation data to generate meaningful coaching feedback. Continue the simulation or try another rehearsal.",
        howYouCameAcross: "Insufficient conversation data for analysis.",
        whatWorked: [],
        opportunities: ["Have a longer conversation to enable coaching feedback"],
        replayMoment: {
          turnId: null,
          originalMoment: "No sufficient user participation to analyze.",
          howYouLikelySounded: "Unable to analyze - insufficient data.",
          howItMayHaveLanded: "Unable to analyze - insufficient data.",
          strongerVersion: "Continue the conversation to get meaningful feedback.",
          deliveryTip: "Practice more to generate evidence-based coaching."
        }
      };
    }
    
    // Generate evidence-based feedback for sufficient data
    const strengths = analyzeStrengths(userTurns, transcript);
    const opportunities = analyzeOpportunities(userTurns, transcript);
    const assessment = generateEvidenceBasedAssessment(userTurns, transcript);
    const howYouCameAcross = analyzeHowYouCameAcross(userTurns, transcript);
    const replayMoment = identifyReplayMoment(userTurns, transcript);
    
    return {
      overallAssessment: assessment.text,
      howYouCameAcross: howYouCameAcross.text,
      whatWorked: strengths.map(s => s.claim),
      opportunities: opportunities.map(o => o.claim),
      replayMoment,
      // Developer validation mode
      _validation: {
        assessment: { claim: assessment.text, supportingMessages: assessment.evidence },
        howYouCameAcross: { claim: howYouCameAcross.text, supportingMessages: howYouCameAcross.evidence },
        strengths: strengths,
        opportunities: opportunities
      }
    };
  };

  const analyzeStrengths = (userTurns: any[], fullTranscript: any[]) => {
    const strengths = [];
    
    // Look for evidence of specific positive behaviors
    for (const turn of userTurns) {
      const text = turn.text.toLowerCase();
      
      // Evidence: Direct acknowledgment
      if (text.includes('i understand') || text.includes('i see') || text.includes('that makes sense')) {
        strengths.push({
          claim: `You acknowledged their perspective when you said "${turn.text.substring(0, 50)}..."`,
          supportingMessages: [turn.id],
          evidence: turn.text
        });
      }
      
      // Evidence: Asking clarifying questions  
      if (text.includes('what') && text.includes('?') || text.includes('how') && text.includes('?')) {
        strengths.push({
          claim: `You asked clarifying questions, showing engagement: "${turn.text}"`,
          supportingMessages: [turn.id],
          evidence: turn.text
        });
      }
      
      // Evidence: Taking ownership
      if (text.includes('my mistake') || text.includes('i should have') || text.includes('i was wrong')) {
        strengths.push({
          claim: `You took ownership of the issue: "${turn.text}"`,
          supportingMessages: [turn.id],
          evidence: turn.text
        });
      }
      
      // Evidence: Proposing solutions
      if (text.includes('we could') || text.includes('what if') || text.includes('let\'s')) {
        strengths.push({
          claim: `You proposed collaborative solutions: "${turn.text}"`,
          supportingMessages: [turn.id], 
          evidence: turn.text
        });
      }
    }
    
    // Return max 3 strengths with strongest evidence
    return strengths.slice(0, 3);
  };

  const analyzeOpportunities = (userTurns: any[], fullTranscript: any[]) => {
    const opportunities = [];
    
    for (const turn of userTurns) {
      const text = turn.text.toLowerCase();
      
      // Evidence: Defensive language
      if (text.includes('but') || text.includes('however') || text.includes('actually')) {
        opportunities.push({
          claim: `Consider removing defensive language. Instead of "${turn.text.substring(0, 30)}...", try a more collaborative approach.`,
          supportingMessages: [turn.id],
          evidence: turn.text
        });
      }
      
      // Evidence: Vague responses
      if (text.includes('maybe') || text.includes('i think') || text.includes('probably') || text.includes('sort of')) {
        opportunities.push({
          claim: `Replace uncertain language with confident statements. Your response "${turn.text}" could be more definitive.`,
          supportingMessages: [turn.id],
          evidence: turn.text
        });
      }
      
      // Evidence: Very short responses (less than 5 words)
      if (turn.text.split(' ').length < 5) {
        opportunities.push({
          claim: `Expand on your thoughts. Your brief response "${turn.text}" could include more detail or reasoning.`,
          supportingMessages: [turn.id],
          evidence: turn.text
        });
      }
    }
    
    return opportunities.slice(0, 3);
  };

  const generateEvidenceBasedAssessment = (userTurns: any[], fullTranscript: any[]) => {
    const userResponseCount = userTurns.length;
    const avgResponseLength = userTurns.reduce((sum, turn) => sum + turn.text.length, 0) / userTurns.length;
    const totalWords = userTurns.reduce((count, turn) => count + turn.text.split(/\s+/).length, 0);
    
    let assessment = `You participated in ${userResponseCount} exchanges with an average response length of ${Math.round(avgResponseLength)} characters (${totalWords} total words). `;
    
    // Add specific evidence-based observations
    const hasQuestions = userTurns.some(turn => turn.text.includes('?'));
    const hasOwnership = userTurns.some(turn => 
      turn.text.toLowerCase().includes('my mistake') || 
      turn.text.toLowerCase().includes('i should have'));
    
    if (hasQuestions) {
      assessment += "You asked questions to gather information. ";
    }
    
    if (hasOwnership) {
      assessment += "You demonstrated accountability by taking ownership. ";
    }
    
    return {
      text: assessment,
      evidence: userTurns.map(turn => turn.id)
    };
  };

  const analyzeHowYouCameAcross = (userTurns: any[], fullTranscript: any[]) => {
    // Analyze tone and delivery based on word choice and structure
    const allText = userTurns.map(turn => turn.text.toLowerCase()).join(' ');
    
    let tone = "measured";
    const evidence = [];
    
    if (allText.includes('sorry') || allText.includes('apologize')) {
      tone = "apologetic and accommodating";
      evidence.push(...userTurns.filter(turn => 
        turn.text.toLowerCase().includes('sorry') || 
        turn.text.toLowerCase().includes('apologize')).map(turn => turn.id));
    } else if (allText.includes('definitely') || allText.includes('absolutely') || allText.includes('certainly')) {
      tone = "confident and direct";  
      evidence.push(...userTurns.filter(turn => 
        turn.text.toLowerCase().includes('definitely') || 
        turn.text.toLowerCase().includes('absolutely')).map(turn => turn.id));
    } else if (allText.includes('maybe') || allText.includes('perhaps') || allText.includes('i think')) {
      tone = "tentative and thoughtful";
      evidence.push(...userTurns.filter(turn => 
        turn.text.toLowerCase().includes('maybe') || 
        turn.text.toLowerCase().includes('perhaps')).map(turn => turn.id));
    }
    
    return {
      text: `You likely came across as ${tone} based on your language choices.`,
      evidence: evidence
    };
  };

  const identifyReplayMoment = (userTurns: any[], fullTranscript: any[]) => {
    if (userTurns.length === 0) {
      return {
        turnId: null,
        originalMoment: "No user responses to analyze.",
        howYouLikelySounded: "No audio data.",
        howItMayHaveLanded: "No interaction occurred.",
        strongerVersion: "Participate more in the conversation.",
        deliveryTip: "Practice speaking up during conversations."
      };
    }
    
    // Pick the longest user response as most substantial for analysis
    const longestResponse = userTurns.reduce((longest, current) => 
      current.text.length > longest.text.length ? current : longest
    );
    
    return {
      turnId: longestResponse.id,
      originalMoment: longestResponse.text,
      howYouLikelySounded: `This response was ${longestResponse.text.length} characters and likely came across as your most substantial contribution.`,
      howItMayHaveLanded: "This represented your main engagement with the conversation.",
      strongerVersion: longestResponse.text + " What are your thoughts on this approach?",
      deliveryTip: "Consider building on substantial responses like this with follow-up questions or additional detail."
    };
  };

  const generateFallbackFeedbackReport = (): any => {
    console.log('🔍 FALLBACK_FEEDBACK_AUDIT', {
      transcriptLength: transcript.length,
      userTurnCount: transcript.filter(turn => turn.speaker === 'user').length,
      transcript: transcript.map(t => ({ id: t.id, speaker: t.speaker, text: t.text }))
    });
    
    // Always use evidence-based feedback generation
    return generateEvidenceBasedFeedback();
  };

  const forceCompleteCurrentConversation = () => {
    console.trace("FORCE_COMPLETE_CALLED");
    console.log('🔚 FORCE_COMPLETE_CONVERSATION', { sessionId, session, currentAttempt });
    
    // Add guard to prevent execution when no session
    if (!sessionId && !session) {
      console.log('🔚 FORCE_COMPLETE: No session to complete, returning early');
      return;
    }
    
    // Clear inactivity timeout
    clearInactivityTimeout();
    
    if (!sessionId || !session) {
      console.log('No valid session to complete');
      return;
    }
    
    // Force complete the session state
    const now = new Date().toISOString();
    
    console.trace('SESSION_MARKED_COMPLETE: Updating session status to complete');
    const updatedSession = {
      ...session,
      status: 'complete' as const,
      phase: 'complete' as const
    };
    
    console.trace('ATTEMPT_MARKED_COMPLETE: Updating attempt status to complete');
    const updatedAttempt = currentAttempt ? {
      ...currentAttempt,
      status: 'complete' as const,
      endedAt: now,
      feedbackReport: currentAttempt.feedbackReport || generateFallbackFeedbackReport()
    } : null;
    
    // Update the attempt in the session
    if (updatedSession.attempts && updatedAttempt) {
      const attemptIndex = updatedSession.attempts.findIndex(a => a.id === updatedAttempt.id);
      if (attemptIndex >= 0) {
        updatedSession.attempts[attemptIndex] = updatedAttempt;
      }
    }
    
    // Persist to localStorage
    try {
      console.trace('CALLING_endSessionAttempt: Persisting session completion');
      endSessionAttempt(sessionId);
    } catch (error) {
      console.log('Session persistence failed, updating local state anyway:', error);
    }
    
    // Update local state immediately
    setSession(updatedSession);
    setCurrentAttempt(updatedAttempt);
    
    console.log('Session force completed:', { updatedSession, updatedAttempt });
  };

  const forceEndCurrentSession = async () => {
    if (!sessionId) {
      console.log('ERROR: No sessionId when trying to end session');
      return;
    }
    
    console.log('🔚 FORCE_END_SESSION', { sessionId, session, currentAttempt });
    
    // Clear inactivity timeout
    clearInactivityTimeout();
    
    // Stop voice interaction if available
    if (conversationRef.current) {
      console.log('Ending ElevenLabs conversation');
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    
    // Set voice state to idle
    setIsSessionActive(false);
    setConversationState('idle');
    
    // Stop audio recording and process
    let audioBlob: Blob | null = null;
    if (isRecording) {
      audioBlob = await audioRecordingService.stopRecording();
      setIsRecording(false);
    }
    
    // Generate feedback report with audio analysis
    try {
      await generateFeedbackReport(audioBlob);
    } catch (error) {
      console.log('Feedback generation failed, but continuing with session completion');
    }
    
    // Use the proper library function to complete the attempt
    // This sets session.status = "complete", session.phase = "complete", 
    // currentAttempt.status = "complete", currentAttempt.endedAt = now, and persists
    console.log('Calling endSessionAttempt with sessionId:', sessionId);
    endSessionAttempt(sessionId);
    console.log('endSessionAttempt called successfully');
    
    // Update local state to reflect the changes
    const updatedSession = getSession(sessionId);
    const updatedAttempt = getCurrentAttempt(updatedSession);
    
    console.log('Session completed:', { updatedSession, updatedAttempt });
    
    setSession(updatedSession);
    setCurrentAttempt(updatedAttempt);
  };

  const endCurrentAttempt = async () => {
    await forceEndCurrentSession();
  };

  // Centralized function to end the current conversation
  const endCurrentConversation = async () => {
    await endCurrentAttempt();
  };

  const handleEndConversation = () => {
    console.log("END_CALL_CLICKED", { 
      hasSetupConversation: Boolean(setupConversation), 
      hasSessionId: Boolean(sessionId), 
      hasSession: Boolean(session),
      sessionPhase: session?.phase,
      setupId,
      currentUrl: window.location.href,
      params
    });
    
    // If session is already complete, do nothing (idempotent)
    if (session?.status === 'complete' && session?.phase === 'complete') {
      console.log("END_CALL: Session already complete, no action needed");
      return;
    }
    
    // Step 1: Stop ElevenLabs voice session if it exists
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
        conversationRef.current = null;
        console.log("END_CALL: ElevenLabs session ended");
      } catch (error) {
        console.log('ElevenLabs cleanup failed, continuing anyway:', error);
      }
    }
    
    // Step 2: Set voice state to idle/inactive
    setIsSessionActive(false);
    setConversationState('idle');
    setIsRecording(false);
    
    // Stop audio recording
    if (isRecording) {
      try {
        audioRecordingService.stopRecording();
        console.log("END_CALL: Audio recording stopped");
      } catch (error) {
        console.log('Audio recording cleanup failed, continuing anyway:', error);
      }
    }
    
    // Step 3: Mark the conversation as complete
    // If this is a setup conversation with content, complete it directly
    if (setupConversation && setupId && !sessionId && !session && transcript.length > 0) {
      console.log("END_CALL: Completing setup conversation directly");
      
      // Create a minimal session-like object for the completion UI
      const mockSession = {
        id: setupId,
        title: setupConversation.scenarioDraft || 'Setup Conversation',
        scenario: setupConversation.scenarioDraft || 'Setup Conversation',
        category: 'other' as const,
        status: 'complete' as const,
        phase: 'complete' as const,
        characterName: setupConversation.characterName || 'Assistant',
        characterRole: setupConversation.characterRole || 'Conversation Partner',
        attempts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockAttempt = {
        id: `attempt_${Date.now()}`,
        attemptNumber: 1,
        status: 'complete' as const,
        startedAt: transcript[0]?.timestamp || new Date().toISOString(),
        endedAt: new Date().toISOString(),
        transcript,
        feedbackReport: generateFallbackFeedbackReport()
      };
      
      // Update local state to show completion
      setSession(mockSession);
      setCurrentAttempt(mockAttempt);
      
      console.log("END_CALL: Setup conversation completed with mock session");
      return;
    }
    
    // Handle regular sessions
    if (sessionId && session) {
      console.log("END_CALL: Completing existing session");
      forceCompleteCurrentConversation();
      return;
    }
    
    // No session to complete - stay on conversation page
    console.log("END_CALL: No session to complete, staying on conversation page");
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
    console.trace('NAVIGATE_HOME_CALLED: handleBackHome');
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
      
      // DISABLED: Auto-ending on user decline for demo safety
      // setTimeout(() => {
      //   if (isSessionActive) { // Check if still active
      //     endCurrentAttempt();
      //   }
      // }, 2000); // 2 second delay to allow final agent response
    }
  };

  // Natural ending detection completely removed - users control via End Call button

  const startInactivityTimeout = () => {
    // Clear any existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // DISABLED: Inactivity timeout for demo safety
    // inactivityTimeoutRef.current = setTimeout(() => {
    //   if (isSessionActive) {
    //     console.log('⏰ CONVERSATION_TIMEOUT_REACHED');
    //     endCurrentAttempt();
    //   }
    // }, 5 * 60 * 1000); // 5 minutes
  };

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };

  const checkForSimulationReadiness = (message: string) => {
    if (!setupConversation || !setupId) return;
    
    const lowerMessage = message.toLowerCase().trim();
    const readinessConfirmations = [
      'yes',
      'ready',
      'let\'s do it',
      'let\'s start',
      'begin',
      'start',
      'i\'m ready',
      'let\'s begin',
      'go ahead',
      'sure',
      'okay',
      'ok',
      'yes, ready',
      'ready to begin',
      'let\'s practice',
      'start the simulation'
    ];
    
    const isReady = readinessConfirmations.some(phrase => 
      lowerMessage === phrase || lowerMessage.startsWith(phrase + ' ')
    );
    
    if (isReady) {
      console.log('🚀 SETUP: user confirmed readiness', { message: lowerMessage });
      
      // Check if we have a scenario to work with
      const userScenario = getUserScenarioFromTranscript(setupConversation.clarificationTranscript);
      
      if (userScenario && userScenario.length > 10) {
        console.log('🚀 SETUP: scenario found, scheduling simulation start', { scenario: userScenario });
        // Allow a brief moment for the confirmation message, then start simulation
        setTimeout(() => {
          console.log('🚀 SETUP: timeout complete, calling startSimulationFromSetup');
          startSimulationFromSetup();
        }, 1000); // 1 second delay
      } else {
        console.log('🚀 SETUP: USER_READY_BUT_NO_SCENARIO', { scenario: userScenario });
      }
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
    console.log("VOICE: simulateConversation called", { sessionId, setupId });
    
    if (!sessionId && !setupId) {
      console.error("VOICE: simulateConversation - no sessionId or setupId");
      return;
    }

    // Mock initial AI greeting
    setTimeout(() => {
      console.log("VOICE: adding mock AI greeting");
      
      let aiTurn;
      if (sessionId) {
        aiTurn = sessionManager.addTranscriptTurn(
          sessionId,
          'agent',
          `Hi there! I understand you wanted to discuss ${session?.scenario.toLowerCase()}. I appreciate you making time for this important conversation. How are you feeling about this topic?`
        );
      } else if (setupId) {
        aiTurn = sessionManager.addSetupTranscriptTurn(
          setupId,
          'agent',
          'What conversation do you need to rehearse?'
        );
      }
      
      if (aiTurn) {
        setTranscript(prev => [...prev, aiTurn]);
        console.log("VOICE: mock AI greeting added", aiTurn);
      }
      
      setConversationState('listening');
      console.log("VOICE: mock conversation ready for input");
    }, 2000);
  };

  const handleMockUserInput = (text: string) => {
    // Reset inactivity timeout on any message
    if (isSessionActive) {
      startInactivityTimeout();
    }
    
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
    
    // Check for user readiness in setup conversations
    if (setupConversation) {
      checkForSimulationReadiness(text);
    }
    
    // No live coaching during conversation
    
    // Handle intake response for mock too (setup conversations only)
    if (setupConversation?.scenarioDraft === 'What difficult conversation are you avoiding today?') {
      handleIntakeResponse(text);
    }
    
    setConversationState('thinking');
    
    // Mock AI response
    setTimeout(() => {
      let responses: string[];
      
      if (setupConversation?.scenarioDraft === 'What difficult conversation are you avoiding today?') {
        // Check if we already have a user scenario in the transcript
        const userScenario = getUserScenarioFromTranscript(setupConversation.clarificationTranscript);
        
        if (userScenario && userScenario.length > 10) {
          // User has provided a scenario, ask if they're ready
          responses = [
            "Got it. I understand you need to have this conversation. Ready to begin the practice session?",
            "That sounds like an important conversation. Shall we start practicing this scenario?",
            "I can help you prepare for that. Are you ready to begin the roleplay?",
            "Understood. Let's practice this conversation. Ready to start?"
          ];
        } else {
          // Still gathering info
          responses = [
            "That sounds important. Who do you need to have this conversation with?",
            "I understand. What outcome are you hoping for from this conversation?",
            "That's a significant topic. What are you most worried might happen during this conversation?",
            "Got it. I'll help you practice this. What's your main goal for this conversation?"
          ];
        }
      } else {
        responses = [
          "I can understand why that would be concerning. Can you tell me more about your specific worries?",
          "That sounds like a challenging situation. What outcome are you hoping for?",
          "I appreciate you sharing that with me. What do you think would help move this conversation forward?",
          "That's a valid concern. How do you think the other person might be feeling about this?"
        ];
      }
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Reset inactivity timeout for AI responses too
      if (isSessionActive) {
        startInactivityTimeout();
      }
      
      // Handle setup conversations vs regular sessions
      if (setupConversation && setupId) {
        const aiTurn = sessionManager.addSetupTranscriptTurn(setupId, 'agent', response);
        setTranscript(prev => [...prev, aiTurn]);
        
        // Setup transition now handled via user confirmation or Start simulation button
        // No automatic transition in AI response
      } else if (sessionId) {
        const aiTurn = sessionManager.addTranscriptTurn(sessionId, 'agent', response);
        setTranscript(prev => [...prev, aiTurn]);
        
        // Natural ending detection removed - users control via End Call button
      }
      
      setConversationState('listening');
    }, 1500);
  };

  if (!session && !setupConversation) {
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-r-text-secondary mb-4 font-geist" style={{ fontSize: 14 }}>Session not found</p>
          <Button onClick={() => {
            console.trace('NAVIGATE_HOME_CALLED: Back home button');
            navigate('/');
          }}>Back home</Button>
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

  // Extract the exact active condition used by the header
  const shouldShowActiveStatus = isSessionActive;
  
  // Show End Call button if there's any active session or setup conversation
  const shouldShowEndCall = isSessionActive || Boolean(setupConversation) || Boolean(session);
  
  // Debug logging
  console.log("Conversation render: isSessionActive =", isSessionActive);
  console.log("Conversation render: shouldShowEndCall =", shouldShowEndCall);

  const getSessionStatus = (): 'active' | 'complete' | 'idle' => {
    if (shouldShowActiveStatus) return 'active';
    if (currentAttempt?.status === 'complete') return 'complete';
    return 'idle';
  };

  return (
    <div
      className="min-h-screen bg-r-bg text-r-text-primary flex flex-col"
      style={{
        '--background': 'var(--r-bg)',
        '--foreground': 'var(--r-text-primary)',
        '--card': 'var(--r-surface)',
        '--card-foreground': 'var(--r-text-primary)',
        '--muted': '#333333',
        '--muted-foreground': 'var(--r-text-secondary)',
        '--border': 'rgba(255, 255, 255, 0.1)',
        '--header-height': '60px',
      } as React.CSSProperties}
    >
      {/* Minimal dark header */}
      <div className="flex items-center sticky top-0 z-20 bg-r-bg" style={{ padding: '20px 24px' }}>
        <NavigationIcon onClick={openHistoryPanel} />
        <div className="flex-1 px-4 min-w-0">
          <h1 className="font-geist text-r-text-primary truncate" style={{ fontSize: 14, fontWeight: 500 }}>
            {getSessionTitle()}
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Conversation area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          isFeedbackOpen ? 'mr-0' : ''
        }`}>
          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-6 py-8">
            {transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: 'var(--r-surface)' }}
                  >
                    <Phone className="w-8 h-8 text-r-text-secondary" />
                  </div>
                  <p className="text-r-text-secondary font-geist mb-2" style={{ fontSize: 14 }}>
                    Starting your conversation practice...
                  </p>
                </div>
              </div>
            ) : (
              <div className={`max-w-2xl mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-xl' : 'max-w-2xl'
              }`}>
                <div className="space-y-4">
                  {transcript.map((turn) => (
                    <motion.div
                      key={turn.id}
                      id={`turn-${turn.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`transition-all duration-300 ${
                        highlightedTurnId === turn.id
                          ? 'ring-1 ring-r-accent-purple/40 rounded-xl p-2'
                          : ''
                      }`}
                    >
                      {turn.speaker === 'user' ? (
                        <UserSpeechBubble>{turn.text}</UserSpeechBubble>
                      ) : (
                        <p className="font-geist text-r-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
                          {cleanAssistantText(turn.text)}
                        </p>
                      )}
                    </motion.div>
                  ))}

                  {/* Voice activity indicators */}
                  <AnimatePresence>
                    {isSessionActive && conversationState === 'speaking' && (
                      <motion.div
                        key="system-indicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start py-2"
                      >
                        <SystemActivityIndicator />
                      </motion.div>
                    )}
                    {isSessionActive && conversationState === 'listening' && (
                      <motion.div
                        key="user-indicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-end py-2"
                      >
                        <UserActivityIndicator />
                      </motion.div>
                    )}
                    {isSessionActive && conversationState === 'thinking' && (
                      <motion.div
                        key="thinking-indicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start py-2"
                      >
                        <SystemActivityIndicator />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Call ended state */}
          {currentAttempt?.status === 'complete' && !isGeneratingFeedback && (
            <div className="px-6 pb-8">
              <div className={`mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-xl' : 'max-w-2xl'
              }`}>
                <div className="flex flex-col items-center gap-6 py-8">
                  <StatusLabel>Call ended.</StatusLabel>
                  {currentAttempt.feedbackReport && (
                    <div className="w-full" style={{ maxWidth: 360 }}>
                      <ViewFeedbackButton onClick={handleViewFeedback} />
                    </div>
                  )}
                  <button
                    onClick={handleRunItAgain}
                    className="font-geist text-r-text-secondary uppercase flex items-center gap-2"
                    style={{ fontSize: 14, letterSpacing: '0.04em' }}
                  >
                    <Play className="w-4 h-4" />
                    Run it again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generating feedback state */}
          {isGeneratingFeedback && (
            <div className="px-6 pb-8">
              <div className="flex items-center justify-center gap-3 py-8">
                <Mic className="w-4 h-4 text-r-accent-purple animate-pulse" />
                <span className="font-geist text-r-text-secondary" style={{ fontSize: 14 }}>
                  Analyzing your delivery...
                </span>
              </div>
            </div>
          )}

          {/* Voice interaction area (active call) */}
          {(isSessionActive || (Boolean(setupConversation) && currentAttempt?.status !== 'complete')) && (
            <div className="px-6 pb-6">
              <div className={`max-w-2xl mx-auto transition-all duration-300 ${
                isFeedbackOpen ? 'max-w-xl' : 'max-w-2xl'
              }`}>
                {/* End call button — bottom right */}
                <div className="flex justify-end mb-4">
                  <EndCallButton onClick={handleEndConversation} />
                </div>

                {/* Setup conversation start prompt */}
                {setupConversation && conversationState === 'idle' && !isSessionActive && (
                  <div className="text-center">
                    <button
                      onClick={handleStartConversation}
                      className="font-geist text-r-text-secondary"
                      style={{ fontSize: 14 }}
                    >
                      Tap to start voice conversation
                    </button>
                  </div>
                )}

                {/* Mock input for testing */}
                <div className="mt-4 flex gap-2 justify-center flex-wrap">
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
                  {import.meta.env.DEV && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={generateAnnotations}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Test Annotations
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generateFeedbackReport(null)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Test Feedback
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setIsFeedbackOpen(!isFeedbackOpen);
                          console.log('TOGGLING_FEEDBACK_RAIL', { isOpen: !isFeedbackOpen });
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Toggle Rail
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => checkForUserDecline("No, I'm good")}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Test Decline
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
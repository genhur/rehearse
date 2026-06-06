export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  emotionData?: {
    emotion: string;
    confidence: number;
    valence: number;
    arousal: number;
  };
  hasAnnotation?: boolean;
}

export interface Annotation {
  id: string;
  messageId: string;
  sessionId: string;
  title: string;
  body: string;
  type: 'vague_answer' | 'strong_ownership' | 'avoided_question' | 'stayed_calm' | 
        'missed_acknowledgment' | 'clear_ask' | 'good_boundary' | 'strong_moment' | 
        'premature_problem_solving' | 'acknowledged_concern';
  createdAt: number;
}

export interface KeyMoment {
  id: string;
  annotationId: string;
  messageId: string;
  label: string;
  summary: string;
}

export interface AudioAnalysis {
  primaryEmotion: string;
  confidence: number;
  rawResult: unknown;
}

export interface FeedbackReport {
  overallAssessment: string;
  howYouCameAcross: string;
  whatWorked: string[];
  opportunities: string[];
  replayMoment: {
    originalMoment: string;
    howYouLikelySounded: string;
    howItMayHaveLanded: string;
    strongerVersion: string;
    deliveryTip: string;
  };
}

export interface RehearsalAttempt {
  id: string;
  sessionId: string;
  attemptNumber: number;
  status: 'active' | 'ending' | 'complete';
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  annotations: Annotation[];
  keyMoments: KeyMoment[];
  debriefComplete: boolean;
  audioRecording?: Blob;
  audioAnalysis?: AudioAnalysis;
  feedbackReport?: FeedbackReport;
}

export interface Session {
  id: string;
  scenario: string;
  role: string;
  goal: string;
  worry: string;
  createdAt: number;
  status: 'active' | 'completed';
  phase: 'intake' | 'roleplay';
  currentAttemptId: string;
  attempts: RehearsalAttempt[];
}

class SessionStorage {
  private sessions = new Map<string, Session>();
  
  constructor() {
    // Load sessions from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('rehearse-sessions');
      if (stored) {
        const sessionData = JSON.parse(stored);
        Object.entries(sessionData).forEach(([id, session]) => {
          this.sessions.set(id, session as Session);
        });
      }
    } catch (error) {
      console.error('Error loading sessions from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const sessionData = Object.fromEntries(this.sessions);
      localStorage.setItem('rehearse-sessions', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving sessions to storage:', error);
    }
  }

  createSession(scenario: string, role: string, goal: string, worry: string): Session {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const firstAttemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const firstAttempt: RehearsalAttempt = {
      id: firstAttemptId,
      sessionId,
      attemptNumber: 1,
      status: 'active',
      startedAt: Date.now(),
      messages: [],
      annotations: [],
      keyMoments: [],
      debriefComplete: false
    };

    const session: Session = {
      id: sessionId,
      scenario,
      role,
      goal,
      worry,
      createdAt: Date.now(),
      status: 'active',
      phase: 'roleplay',
      currentAttemptId: firstAttemptId,
      attempts: [firstAttempt]
    };

    this.sessions.set(session.id, session);
    this.saveToStorage();
    return session;
  }

  createNewAttempt(sessionId: string): RehearsalAttempt | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const attemptNumber = session.attempts.length + 1;
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newAttempt: RehearsalAttempt = {
      id: attemptId,
      sessionId,
      attemptNumber,
      status: 'active',
      startedAt: Date.now(),
      messages: [],
      annotations: [],
      keyMoments: [],
      debriefComplete: false
    };

    // Mark previous attempt as complete
    const currentAttempt = this.getCurrentAttempt(sessionId);
    if (currentAttempt) {
      currentAttempt.status = 'complete';
      currentAttempt.endedAt = Date.now();
    }

    session.attempts.push(newAttempt);
    session.currentAttemptId = attemptId;
    session.status = 'active';
    
    this.saveToStorage();
    return newAttempt;
  }

  getCurrentAttempt(sessionId: string): RehearsalAttempt | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    return session.attempts.find(attempt => attempt.id === session.currentAttemptId) || null;
  }

  endCurrentAttempt(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const currentAttempt = this.getCurrentAttempt(sessionId);
    
    if (session && currentAttempt && currentAttempt.status === 'active') {
      currentAttempt.status = 'complete';
      currentAttempt.endedAt = Date.now();
      session.status = 'completed';
      this.saveToStorage();
    }
  }

  getSession(id: string): Session | null {
    return this.sessions.get(id) || null;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  updateSessionStatus(id: string, status: 'active' | 'completed'): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      this.saveToStorage();
    }
  }

  updateSession(id: string, updates: Partial<Session>): void {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, updates);
      this.saveToStorage();
    }
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', text: string): Message {
    const currentAttempt = this.getCurrentAttempt(sessionId);
    if (!currentAttempt) {
      throw new Error(`No active attempt found for session ${sessionId}`);
    }

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role,
      text,
      timestamp: Date.now()
    };

    currentAttempt.messages.push(message);
    this.saveToStorage();
    return message;
  }

  getMessages(sessionId: string): Message[] {
    const currentAttempt = this.getCurrentAttempt(sessionId);
    return currentAttempt ? currentAttempt.messages : [];
  }

  addAnnotation(sessionId: string, messageId: string, title: string, body: string, type: Annotation['type']): Annotation {
    const currentAttempt = this.getCurrentAttempt(sessionId);
    if (!currentAttempt) {
      throw new Error(`No active attempt found for session ${sessionId}`);
    }

    const annotation: Annotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId,
      sessionId,
      title,
      body,
      type,
      createdAt: Date.now()
    };

    currentAttempt.annotations.push(annotation);
    
    // Mark message as having annotation
    const message = currentAttempt.messages.find(m => m.id === messageId);
    if (message) {
      message.hasAnnotation = true;
    }
    
    this.saveToStorage();
    return annotation;
  }

  addKeyMoment(sessionId: string, annotationId: string, messageId: string, label: string, summary: string): KeyMoment {
    const currentAttempt = this.getCurrentAttempt(sessionId);
    if (!currentAttempt) {
      throw new Error(`No active attempt found for session ${sessionId}`);
    }

    const keyMoment: KeyMoment = {
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      annotationId,
      messageId,
      label,
      summary
    };

    currentAttempt.keyMoments.push(keyMoment);
    this.saveToStorage();
    return keyMoment;
  }

  markDebriefComplete(sessionId: string): void {
    const currentAttempt = this.getCurrentAttempt(sessionId);
    if (currentAttempt) {
      currentAttempt.debriefComplete = true;
      this.saveToStorage();
    }
  }
}

// Global session storage instance
export const sessionStorage = new SessionStorage();
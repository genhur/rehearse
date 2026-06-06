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
        'missed_acknowledgment' | 'clear_ask' | 'good_boundary' | 'strong_moment' | 'premature_problem_solving';
  createdAt: number;
}

export interface KeyMoment {
  id: string;
  annotationId: string;
  messageId: string;
  label: string;
  summary: string;
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
  debriefComplete: boolean;
  messages: Message[];
  annotations: Annotation[];
  keyMoments: KeyMoment[];
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
    const session: Session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scenario,
      role,
      goal,
      worry,
      createdAt: Date.now(),
      status: 'active',
      phase: 'roleplay', // default phase
      debriefComplete: false,
      messages: [],
      annotations: [],
      keyMoments: []
    };

    this.sessions.set(session.id, session);
    this.saveToStorage();
    return session;
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
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role,
      text,
      timestamp: Date.now()
    };

    session.messages.push(message);
    this.saveToStorage();
    return message;
  }

  getMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  addAnnotation(sessionId: string, messageId: string, title: string, body: string, type: Annotation['type']): Annotation {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
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

    session.annotations.push(annotation);
    
    // Mark message as having annotation
    const message = session.messages.find(m => m.id === messageId);
    if (message) {
      message.hasAnnotation = true;
    }
    
    this.saveToStorage();
    return annotation;
  }

  addKeyMoment(sessionId: string, annotationId: string, messageId: string, label: string, summary: string): KeyMoment {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const keyMoment: KeyMoment = {
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      annotationId,
      messageId,
      label,
      summary
    };

    session.keyMoments.push(keyMoment);
    this.saveToStorage();
    return keyMoment;
  }

  markDebriefComplete(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.debriefComplete = true;
      this.saveToStorage();
    }
  }
}

// Global session storage instance
export const sessionStorage = new SessionStorage();
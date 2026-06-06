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
  hasCoachNote?: boolean;
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
  messages: Message[];
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
      messages: []
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
}

// Global session storage instance
export const sessionStorage = new SessionStorage();
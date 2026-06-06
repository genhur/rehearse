export type RehearsalSession = {
  id: string;
  title: string;
  scenario: string;
  category: "professional" | "personal" | "other";
  characterName: string;
  characterRole: string;
  status: "active" | "complete";
  createdAt: string;
  updatedAt: string;
  attempts: RehearsalAttempt[];
  latestReport?: FeedbackReport;
};

export type RehearsalAttempt = {
  id: string;
  attemptNumber: number;
  status: "active" | "complete";
  startedAt: string;
  endedAt?: string;
  transcript: TranscriptTurn[];
  audioAnalysis?: AudioAnalysis;
  feedbackReport?: FeedbackReport;
};

export type TranscriptTurn = {
  id: string;
  speaker: "user" | "agent";
  speakerName: string;
  text: string;
  timestamp: string;
};

export type AudioAnalysis = {
  primaryEmotion: string;
  confidence: number;
  rawResult: unknown;
};

export type FeedbackReport = {
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
};

const STORAGE_KEY = 'rehearse.sessions';

// Title generation helper
export function generateSessionTitle(scenario: string): string {
  const lower = scenario.toLowerCase();
  
  // Remove common prefixes
  let title = scenario;
  const prefixes = [
    'i need to tell',
    'i need to ask',
    'i have to tell',
    'i have to ask',
    'i want to tell',
    'i want to ask',
    'i should tell',
    'i should ask'
  ];
  
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      title = scenario.substring(prefix.length).trim();
      break;
    }
  }
  
  // Generate title based on content patterns
  if (lower.includes('deal fell through') || lower.includes('deal failed')) {
    return 'Failed Deal with Cofounder';
  }
  
  if (lower.includes('runway') && (lower.includes('tight') || lower.includes('low'))) {
    return 'Runway Concerns with Team';
  }
  
  if (lower.includes('raise') && lower.includes('manager')) {
    return 'Ask Manager for a Raise';
  }
  
  if (lower.includes('performance review') || lower.includes('underperforming')) {
    return 'Difficult Performance Review';
  }
  
  if ((lower.includes('break up') || lower.includes('end') || lower.includes('stop dating')) && 
      (lower.includes('partner') || lower.includes('relationship'))) {
    return 'Ending a Relationship Kindly';
  }
  
  if (lower.includes('boundary') || lower.includes('boundaries')) {
    return 'Set Boundaries Clearly';
  }
  
  if (lower.includes('family') && lower.includes('conversation')) {
    return 'Difficult Family Conversation';
  }
  
  if (lower.includes('feedback') || lower.includes('criticism')) {
    return 'Give Constructive Feedback';
  }
  
  if (lower.includes('investor') || lower.includes('funding')) {
    return 'Update Investor on Status';
  }
  
  // Fallback: Clean up and capitalize
  title = title
    .replace(/^(my|the|a|an)\s+/i, '')
    .replace(/\s+(that|about|regarding).*$/i, '')
    .trim();
  
  // Limit length and capitalize
  if (title.length > 35) {
    title = title.substring(0, 32) + '...';
  }
  
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// Category detection helper
export function detectSessionCategory(scenario: string): "professional" | "personal" | "other" {
  const lower = scenario.toLowerCase();
  
  const professionalKeywords = [
    'cofounder', 'co-founder', 'coworker', 'colleague', 'manager', 'boss', 
    'supervisor', 'investor', 'client', 'customer', 'team', 'employee',
    'runway', 'deal', 'raise', 'salary', 'work', 'office', 'business',
    'project', 'performance', 'review', 'meeting', 'funding', 'startup'
  ];
  
  const personalKeywords = [
    'partner', 'boyfriend', 'girlfriend', 'spouse', 'wife', 'husband',
    'relationship', 'dating', 'family', 'parent', 'mom', 'dad', 'mother', 
    'father', 'friend', 'roommate', 'sibling', 'brother', 'sister'
  ];
  
  // Check for professional keywords
  for (const keyword of professionalKeywords) {
    if (lower.includes(keyword)) {
      return 'professional';
    }
  }
  
  // Check for personal keywords
  for (const keyword of personalKeywords) {
    if (lower.includes(keyword)) {
      return 'personal';
    }
  }
  
  return 'other';
}

// Session storage utilities
class SessionManager {
  private sessions: Map<string, RehearsalSession> = new Map();
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sessionData = JSON.parse(stored);
        Object.entries(sessionData).forEach(([id, session]) => {
          this.sessions.set(id, session as RehearsalSession);
        });
      }
    } catch (error) {
      console.error('Error loading sessions from storage:', error);
    }
  }
  
  private saveToStorage() {
    try {
      const sessionData = Object.fromEntries(this.sessions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving sessions to storage:', error);
    }
  }
  
  getSessions(): RehearsalSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  getSession(id: string): RehearsalSession | null {
    return this.sessions.get(id) || null;
  }
  
  createSession(scenario: string, characterRole: string = '', goal: string = '', worry: string = ''): RehearsalSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const title = generateSessionTitle(scenario);
    const category = detectSessionCategory(scenario);
    
    const firstAttempt: RehearsalAttempt = {
      id: attemptId,
      attemptNumber: 1,
      status: 'active',
      startedAt: now,
      transcript: []
    };
    
    const session: RehearsalSession = {
      id: sessionId,
      title,
      scenario,
      category,
      characterName: characterRole || 'AI Assistant',
      characterRole: characterRole || 'Conversation Partner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      attempts: [firstAttempt]
    };
    
    this.sessions.set(sessionId, session);
    this.saveToStorage();
    return session;
  }
  
  updateSession(session: RehearsalSession): void {
    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.id, session);
    this.saveToStorage();
  }
  
  completeSession(id: string, report?: FeedbackReport): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = 'complete';
      session.updatedAt = new Date().toISOString();
      if (report) {
        session.latestReport = report;
      }
      this.saveToStorage();
    }
  }
  
  deleteSession(id: string): void {
    this.sessions.delete(id);
    this.saveToStorage();
  }
  
  addTranscriptTurn(sessionId: string, speaker: 'user' | 'agent', text: string): TranscriptTurn {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const currentAttempt = session.attempts[session.attempts.length - 1];
    if (!currentAttempt) {
      throw new Error(`No active attempt found for session ${sessionId}`);
    }
    
    const turn: TranscriptTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      speaker,
      speakerName: speaker === 'user' ? 'You' : session.characterName,
      text,
      timestamp: new Date().toISOString()
    };
    
    currentAttempt.transcript.push(turn);
    this.updateSession(session);
    return turn;
  }
  
  createNewAttempt(sessionId: string): RehearsalAttempt {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Complete previous attempt
    const currentAttempt = session.attempts[session.attempts.length - 1];
    if (currentAttempt && currentAttempt.status === 'active') {
      currentAttempt.status = 'complete';
      currentAttempt.endedAt = new Date().toISOString();
    }
    
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAttempt: RehearsalAttempt = {
      id: attemptId,
      attemptNumber: session.attempts.length + 1,
      status: 'active',
      startedAt: new Date().toISOString(),
      transcript: []
    };
    
    session.attempts.push(newAttempt);
    session.status = 'active';
    this.updateSession(session);
    return newAttempt;
  }
  
  completeAttempt(sessionId: string, feedbackReport?: FeedbackReport, audioAnalysis?: AudioAnalysis): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const currentAttempt = session.attempts[session.attempts.length - 1];
    if (currentAttempt && currentAttempt.status === 'active') {
      currentAttempt.status = 'complete';
      currentAttempt.endedAt = new Date().toISOString();
      if (feedbackReport) {
        currentAttempt.feedbackReport = feedbackReport;
        session.latestReport = feedbackReport;
      }
      if (audioAnalysis) {
        currentAttempt.audioAnalysis = audioAnalysis;
      }
    }
    
    this.updateSession(session);
  }
  
  getCurrentAttempt(sessionId: string): RehearsalAttempt | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    return session.attempts[session.attempts.length - 1] || null;
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();

// Convenience functions
export const getSessions = () => sessionManager.getSessions();
export const getSession = (id: string) => sessionManager.getSession(id);
export const createSession = (scenario: string, characterRole?: string, goal?: string, worry?: string) => 
  sessionManager.createSession(scenario, characterRole, goal, worry);
export const updateSession = (session: RehearsalSession) => sessionManager.updateSession(session);
export const completeSession = (id: string, report?: FeedbackReport) => sessionManager.completeSession(id, report);
export const deleteSession = (id: string) => sessionManager.deleteSession(id);
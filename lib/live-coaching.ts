import { Message } from './session';

export type CoachNoteType = 
  | 'softened_ask'
  | 'over_apologized' 
  | 'avoided_answer'
  | 'stayed_regulated'
  | 'strong_moment'
  | 'unclear_boundary'
  | 'missed_opportunity'
  | 'direct_clear_ask';

export type CoachNoteSeverity = 'positive' | 'neutral' | 'important';

export interface CoachNote {
  id: string;
  messageId: string;
  sessionId: string;
  type: CoachNoteType;
  severity: CoachNoteSeverity;
  text: string;
  suggestion?: string;
  createdAt: number;
}

export interface CoachingRequest {
  sessionId: string;
  latestUserMessage: Message;
  recentMessages: Message[]; // last 3-5 messages for context
  sessionContext: {
    scenario: string;
    role: string;
    phase: string;
  };
}

class LiveCoachingService {
  private analysisQueue = new Map<string, NodeJS.Timeout>();
  private coachNotes = new Map<string, CoachNote[]>(); // sessionId -> notes[]
  
  async analyzeMessage(request: CoachingRequest): Promise<CoachNote | null> {
    // Debounce analysis - only analyze after user stops "speaking"
    const debounceKey = `${request.sessionId}_${request.latestUserMessage.id}`;
    
    if (this.analysisQueue.has(debounceKey)) {
      clearTimeout(this.analysisQueue.get(debounceKey)!);
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        this.analysisQueue.delete(debounceKey);
        const note = await this.performAnalysis(request);
        if (note) {
          this.addCoachNote(request.sessionId, note);
        }
        resolve(note);
      }, 1500); // Wait 1.5s after message to analyze
      
      this.analysisQueue.set(debounceKey, timeout);
    });
  }
  
  private async performAnalysis(request: CoachingRequest): Promise<CoachNote | null> {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured for live coaching');
      return null;
    }
    
    const systemPrompt = `You are a quiet communication coach observing a live rehearsal. Your job is not to interrupt. Only create a coach note when the user does something meaningfully helpful or meaningfully worth adjusting. Return null most of the time. The note should be specific, brief, and attached to the latest user message.

Focus on:
- Clarity and directness
- Emotional regulation
- Boundaries and assertiveness  
- Warmth and empathy
- Active listening
- Progress toward conversation goals

Prioritize behavioral observations over generic advice. Be sparse - only note genuinely useful moments.

Response format (JSON):
{
  "hasNote": boolean,
  "type": "softened_ask" | "over_apologized" | "avoided_answer" | "stayed_regulated" | "strong_moment" | "unclear_boundary" | "missed_opportunity" | "direct_clear_ask" | null,
  "severity": "positive" | "neutral" | "important",
  "text": "one sentence observation",
  "suggestion": "optional brief suggestion"
}`;
    
    const recentContext = request.recentMessages
      .map(m => `${m.role.toUpperCase()}: ${m.text}`)
      .join('\n');
    
    const userPrompt = `Conversation context:
Scenario: ${request.sessionContext.scenario}
Speaking with: ${request.sessionContext.role}
Phase: ${request.sessionContext.phase}

Recent messages:
${recentContext}

Latest user message: "${request.latestUserMessage.text}"

Should this user message receive a coach note? Remember: be very selective. Most messages should receive no coaching.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);
      
      if (!analysis.hasNote || !analysis.type) {
        return null;
      }
      
      return {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        messageId: request.latestUserMessage.id,
        sessionId: request.sessionId,
        type: analysis.type,
        severity: analysis.severity || 'neutral',
        text: analysis.text,
        suggestion: analysis.suggestion,
        createdAt: Date.now()
      };
      
    } catch (error) {
      console.error('[LiveCoaching] Analysis failed:', error);
      return null;
    }
  }
  
  private addCoachNote(sessionId: string, note: CoachNote): void {
    if (!this.coachNotes.has(sessionId)) {
      this.coachNotes.set(sessionId, []);
    }
    this.coachNotes.get(sessionId)!.push(note);
  }
  
  getCoachNotes(sessionId: string): CoachNote[] {
    return this.coachNotes.get(sessionId) || [];
  }
  
  getLatestCoachNote(sessionId: string): CoachNote | null {
    const notes = this.getCoachNotes(sessionId);
    return notes.length > 0 ? notes[notes.length - 1] : null;
  }
  
  getCoachNoteForMessage(messageId: string, sessionId: string): CoachNote | null {
    const notes = this.getCoachNotes(sessionId);
    return notes.find(note => note.messageId === messageId) || null;
  }
  
  clearSession(sessionId: string): void {
    this.coachNotes.delete(sessionId);
    // Clear any pending analysis for this session
    for (const [key, timeout] of this.analysisQueue.entries()) {
      if (key.startsWith(sessionId)) {
        clearTimeout(timeout);
        this.analysisQueue.delete(key);
      }
    }
  }
}

// Global instance
export const liveCoachingService = new LiveCoachingService();
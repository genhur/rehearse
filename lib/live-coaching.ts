import { Message } from './session';

export type CoachNoteType = 
  | 'avoided_answer'
  | 'stayed_regulated'
  | 'strong_moment'
  | 'missed_opportunity'
  | 'direct_clear_ask'
  | 'vague_response'
  | 'acknowledged_concern';

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
    console.log('🎯 COACH_ANALYSIS_REQUESTED', {
      sessionId: request.sessionId,
      messageId: request.latestUserMessage.id,
      messageText: request.latestUserMessage.text,
      messageRole: request.latestUserMessage.role
    });
    
    // Debounce analysis - only analyze after user stops "speaking"
    const debounceKey = `${request.sessionId}_${request.latestUserMessage.id}`;
    
    if (this.analysisQueue.has(debounceKey)) {
      clearTimeout(this.analysisQueue.get(debounceKey)!);
      console.log('🎯 COACH_ANALYSIS_DEBOUNCED', { debounceKey });
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        this.analysisQueue.delete(debounceKey);
        console.log('🎯 COACH_ANALYSIS_EXECUTING', { debounceKey });
        const note = await this.performAnalysis(request);
        if (note) {
          this.addCoachNote(request.sessionId, note);
          console.log('🎯 COACH_NOTE_CREATED', note);
        } else {
          console.log('🎯 COACH_ANALYSIS_NO_NOTE');
        }
        resolve(note);
      }, 1500); // Wait 1.5s after message to analyze
      
      this.analysisQueue.set(debounceKey, timeout);
    });
  }
  
  private async performAnalysis(request: CoachingRequest): Promise<CoachNote | null> {
    console.log('🎯 COACH_ANALYSIS_START', {
      sessionId: request.sessionId,
      messageText: request.latestUserMessage.text,
      recentMessagesCount: request.recentMessages.length
    });
    
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('🎯 COACH_ANALYSIS_NO_API_KEY');
      
      // No fallback notes when API key is missing
      
      return null;
    }
    
    const systemPrompt = `You are a communication coach observing a rehearsal. Create coach notes ONLY for genuinely observable communication patterns. Most messages should receive NO coaching.

ONLY create notes when you observe:
- Vague responses when specificity was needed
- Clear, direct communication in difficult moments
- Avoiding or deflecting direct questions
- Strong emotional regulation under pressure
- Missing opportunities to acknowledge concerns
- Naming business impact or consequences clearly
- Moving to explanation before addressing the core issue

NEVER create notes for:
- Generic filler words or hesitation
- Normal conversational flow
- Messages that don't contain significant communication choices
- Situations where you would give generic advice like "be more confident"

Good examples:
- "You gave a vague timeline when they asked for specifics"
- "You stayed calm and clear after they challenged the decision"
- "You named the financial impact directly here"
- "You moved to explaining reasons before acknowledging their concern"

Bad examples:
- "You could be more confident"
- "Good communication"
- "You hesitated here"

Reference specific words/phrases from the user's actual message. The note must connect to observable behavior in their text.

Response format (JSON):
{
  "hasNote": boolean,
  "type": "avoided_answer" | "stayed_regulated" | "strong_moment" | "missed_opportunity" | "direct_clear_ask" | "vague_response" | "acknowledged_concern",
  "severity": "positive" | "neutral" | "important", 
  "text": "specific observation referencing their actual words",
  "suggestion": "concrete alternative phrasing if helpful"
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

Should this user message receive a coach note? Remember: be very selective. Most messages should receive no coaching. Only create notes for genuinely observable communication patterns or missed opportunities.`;

    try {
      console.log('🎯 COACH_ANALYSIS_CALLING_OPENAI', {
        model: 'gpt-4o-mini',
        messageText: request.latestUserMessage.text
      });
      
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
      console.log('🎯 COACH_ANALYSIS_RESPONSE', result);
      
      const analysis = JSON.parse(result.choices[0].message.content);
      console.log('🎯 COACH_ANALYSIS_PARSED', analysis);
      
      if (!analysis.hasNote || !analysis.type) {
        console.log('🎯 COACH_ANALYSIS_NO_NOTE_NEEDED');
        return null;
      }
      
      const note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        messageId: request.latestUserMessage.id,
        sessionId: request.sessionId,
        type: analysis.type,
        severity: analysis.severity || 'neutral',
        text: analysis.text,
        suggestion: analysis.suggestion,
        createdAt: Date.now()
      };
      
      console.log('🎯 COACH_ANALYSIS_NOTE_GENERATED', note);
      return note;
      
    } catch (error) {
      console.error('🎯 COACH_ANALYSIS_FAILED:', error);
      
      // No fallback notes in production - just log the error
      
      return null;
    }
  }
  
  private addCoachNote(sessionId: string, note: CoachNote): void {
    console.log('🎯 COACH_NOTE_ADDING', {
      sessionId,
      noteId: note.id,
      noteText: note.text,
      messageId: note.messageId
    });
    
    if (!this.coachNotes.has(sessionId)) {
      this.coachNotes.set(sessionId, []);
    }
    this.coachNotes.get(sessionId)!.push(note);
    
    console.log('🎯 COACH_NOTE_ADDED', {
      sessionId,
      totalNotes: this.coachNotes.get(sessionId)!.length
    });
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
  
  addCoachNotePublic(sessionId: string, note: CoachNote): void {
    this.addCoachNote(sessionId, note);
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
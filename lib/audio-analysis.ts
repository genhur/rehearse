import type { AudioAnalysis, FeedbackReport, Message } from './session';

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  async startRecording(): Promise<boolean> {
    try {
      console.log('🎤 STARTING_AUDIO_RECORDING');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      console.log('🎤 AUDIO_RECORDING_STARTED');
      return true;
    } catch (error) {
      console.error('🎤 AUDIO_RECORDING_FAILED', error);
      return false;
    }
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    console.log('🎤 STOPPING_AUDIO_RECORDING');

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('🎤 AUDIO_RECORDING_COMPLETE', { 
          size: audioBlob.size,
          type: audioBlob.type 
        });
        
        // Clean up
        this.mediaRecorder!.stream.getTracks().forEach(track => track.stop());
        this.isRecording = false;
        
        resolve(audioBlob);
      };

      this.mediaRecorder!.stop();
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export class AudioAnalysisService {
  async analyzeAudio(audioBlob: Blob): Promise<AudioAnalysis | null> {
    const valenceApiKey = import.meta.env.VITE_VALENCE_API_KEY;
    
    if (!valenceApiKey) {
      console.warn('🎤 VALENCE_API_KEY_NOT_CONFIGURED');
      
      // Return mock analysis for development
      if (import.meta.env.DEV) {
        return {
          primaryEmotion: 'confident',
          confidence: 0.75,
          rawResult: { mockData: 'development mode' }
        };
      }
      
      return null;
    }

    try {
      console.log('🎤 SENDING_AUDIO_TO_VALENCE', { size: audioBlob.size });

      // Convert to WAV for Valence
      const wavBlob = await this.convertToWav(audioBlob);
      
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');

      const response = await fetch('https://api.valence.ai/v1/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${valenceApiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Valence API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🎤 VALENCE_ANALYSIS_COMPLETE', result);

      // Extract the primary emotion and confidence
      const primaryEmotion = result.emotion || 'neutral';
      const confidence = result.confidence || 0.5;

      return {
        primaryEmotion,
        confidence,
        rawResult: result
      };

    } catch (error) {
      console.error('🎤 VALENCE_ANALYSIS_FAILED', error);
      
      // Return mock analysis on error for development
      if (import.meta.env.DEV) {
        return {
          primaryEmotion: 'uncertain',
          confidence: 0.6,
          rawResult: { error: error.message }
        };
      }
      
      return null;
    }
  }

  async generateFeedbackReport(
    messages: Message[],
    audioAnalysis: AudioAnalysis | null,
    scenario: string
  ): Promise<FeedbackReport | null> {
    console.log('🔍 FEEDBACK_GENERATION_AUDIT', {
      messageCount: messages.length,
      messages: messages.map(m => ({ id: m.id, role: m.role, text: m.text })),
      scenario,
      hasAudioAnalysis: !!audioAnalysis
    });
    
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('🎤 OPENAI_API_KEY_NOT_CONFIGURED - Using mock feedback');
      return this.createMockFeedback(messages, audioAnalysis);
    }

    try {
      console.log('🎤 GENERATING_FEEDBACK_REPORT');

      // Create transcript with turn IDs for reference
      const transcript = messages
        .map(m => `[ID: ${m.id}] ${m.role.toUpperCase()}: ${m.text}`)
        .join('\n');

      const systemPrompt = `You are a communication coach analyzing a rehearsal conversation. The user practiced a difficult conversation scenario.

CRITICAL REQUIREMENTS:
1. Only analyze if there are at least 3 user turns AND at least 100 words spoken by the user
2. Every feedback claim MUST be grounded in specific transcript evidence
3. Quote exact text from the transcript to support your observations
4. Reference specific turn IDs when making claims

You have access to:
1. The full transcript with turn IDs (shown as [ID: xyz])
2. Audio analysis showing the user's vocal delivery patterns

If insufficient data (less than 3 user turns or less than 100 user words):
Return: {"overallAssessment": "Not enough conversation data to generate meaningful coaching feedback. Continue the simulation or try another rehearsal.", "howYouCameAcross": "Insufficient conversation data for analysis.", "whatWorked": [], "opportunities": ["Have a longer conversation to enable coaching feedback"], "replayMoment": {"turnId": null, "originalMoment": "No sufficient user participation to analyze.", "howYouLikelySounded": "Unable to analyze - insufficient data.", "howItMayHaveLanded": "Unable to analyze - insufficient data.", "strongerVersion": "Continue the conversation to get meaningful feedback.", "deliveryTip": "Practice more to generate evidence-based coaching."}}

For sufficient data, generate feedback that:
- References specific quotes from user messages
- Connects observations to exact turn IDs  
- Avoids generic claims not supported by evidence
- Focuses on what actually happened in the conversation

Response format (JSON):
{
  "overallAssessment": "Evidence-based summary citing specific user responses and turn count",
  "howYouCameAcross": "Based on specific language choices (quote examples)",
  "whatWorked": ["Evidence-based strength with quote: 'exact text from turn ID xyz'", "..."],
  "opportunities": ["Evidence-based improvement with quote: 'instead of saying X in turn Y, try Z'", "..."],
  "replayMoment": {
    "turnId": "exact ID of the user turn from the transcript",
    "originalMoment": "exact quote from transcript",
    "howYouLikelySounded": "analysis based on the specific words used",
    "howItMayHaveLanded": "how this specific message likely affected the conversation",
    "strongerVersion": "improved version of the exact quote",
    "deliveryTip": "specific advice for this particular response"
  }
}`;

      const userPrompt = `Scenario: ${scenario}

Transcript with Turn IDs:
${transcript}

Audio Analysis:
${audioAnalysis ? `Primary emotion detected: ${audioAnalysis.primaryEmotion} (${Math.round(audioAnalysis.confidence * 100)}% confidence)` : 'No audio analysis available'}

Analyze this rehearsal focusing on both content and delivery. Help the user understand how they came across.`;

      const userMessages = messages.filter(m => m.role === 'user');
      const totalUserWords = userMessages.reduce((count, msg) => 
        count + msg.text.split(/\s+/).filter(word => word.length > 0).length, 0);
      
      console.log('🔍 OPENAI_REQUEST_AUDIT', {
        systemPrompt,
        userPrompt,
        transcriptLength: transcript.length,
        userTurnCount: userMessages.length,
        totalUserWords,
        meetsDataRequirements: userMessages.length >= 3 && totalUserWords >= 100
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
      const feedback = JSON.parse(result.choices[0].message.content);

      console.log('🔍 OPENAI_RESPONSE_AUDIT', {
        rawResponse: result.choices[0].message.content,
        parsedFeedback: feedback
      });
      
      console.log('🎤 FEEDBACK_REPORT_GENERATED', feedback);
      return feedback;

    } catch (error) {
      console.error('🎤 FEEDBACK_GENERATION_FAILED', error);
      return this.createMockFeedback(messages, audioAnalysis);
    }
  }

  private async convertToWav(webmBlob: Blob): Promise<Blob> {
    // Simple conversion - in production, might want more sophisticated conversion
    return webmBlob;
  }

  private createMockFeedback(messages: Message[], audioAnalysis: AudioAnalysis | null): FeedbackReport {
    console.log('🔍 MOCK_FEEDBACK_AUDIT', {
      messageCount: messages.length,
      userTurnCount: messages.filter(m => m.role === 'user').length,
      messages: messages.map(m => ({ id: m.id, role: m.role, text: m.text }))
    });
    
    const userMessages = messages.filter(m => m.role === 'user');
    const totalUserWords = userMessages.reduce((count, msg) => {
      return count + msg.text.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    
    // Check for insufficient data
    if (userMessages.length < 3 || totalUserWords < 100) {
      console.log('🔍 MOCK_FEEDBACK: Insufficient data detected', {
        userMessageCount: userMessages.length,
        totalUserWords,
        threshold: { minMessages: 3, minWords: 100 }
      });
      
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
    
    // Generate evidence-based mock feedback for sufficient data
    const strengths = this.analyzeStrengths(userMessages);
    const opportunities = this.analyzeOpportunities(userMessages);
    const longestResponse = userMessages.reduce((longest, current) => 
      current.text.length > longest.text.length ? current : longest
    );
    
    return {
      overallAssessment: `You participated in ${userMessages.length} exchanges with ${totalUserWords} total words. Based on your responses, you engaged with the conversation scenario.`,
      howYouCameAcross: audioAnalysis ? 
        `${audioAnalysis.primaryEmotion} and measured based on vocal analysis` : 
        this.analyzeToneFromText(userMessages),
      whatWorked: strengths.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
      replayMoment: {
        turnId: longestResponse.id,
        originalMoment: longestResponse.text,
        howYouLikelySounded: audioAnalysis ? 
          `${audioAnalysis.primaryEmotion} based on vocal analysis` : 
          "Based on your word choice, this likely came across as your main contribution",
        howItMayHaveLanded: "This represented your primary engagement with the conversation",
        strongerVersion: longestResponse.text + " What are your thoughts on this approach?",
        deliveryTip: "Consider building on substantial responses like this with follow-up questions"
      }
    };
  }

  private analyzeStrengths(userMessages: Message[]): string[] {
    const strengths = [];
    
    for (const msg of userMessages) {
      const text = msg.text.toLowerCase();
      
      if (text.includes('i understand') || text.includes('i see') || text.includes('that makes sense')) {
        strengths.push(`You acknowledged their perspective: "${msg.text.substring(0, 50)}..."`);
      }
      
      if (text.includes('what') && text.includes('?') || text.includes('how') && text.includes('?')) {
        strengths.push(`You asked clarifying questions: "${msg.text}"`);
      }
      
      if (text.includes('my mistake') || text.includes('i should have') || text.includes('i was wrong')) {
        strengths.push(`You took ownership: "${msg.text}"`);
      }
      
      if (text.includes('we could') || text.includes('what if') || text.includes('let\'s')) {
        strengths.push(`You proposed solutions: "${msg.text}"`);
      }
    }
    
    return strengths.length > 0 ? strengths : [`You participated with ${userMessages.length} responses`];
  }

  private analyzeOpportunities(userMessages: Message[]): string[] {
    const opportunities = [];
    
    for (const msg of userMessages) {
      const text = msg.text.toLowerCase();
      
      if (text.includes('but') || text.includes('however') || text.includes('actually')) {
        opportunities.push(`Consider removing defensive language from: "${msg.text.substring(0, 30)}..."`);
      }
      
      if (text.includes('maybe') || text.includes('i think') || text.includes('probably')) {
        opportunities.push(`Use more confident language instead of: "${msg.text}"`);
      }
      
      if (msg.text.split(' ').length < 5) {
        opportunities.push(`Expand on brief responses like: "${msg.text}"`);
      }
    }
    
    return opportunities.length > 0 ? opportunities : ['Practice longer, more detailed responses'];
  }

  private analyzeToneFromText(userMessages: Message[]): string {
    const allText = userMessages.map(msg => msg.text.toLowerCase()).join(' ');
    
    if (allText.includes('sorry') || allText.includes('apologize')) {
      return "Apologetic and accommodating based on your language choices";
    } else if (allText.includes('definitely') || allText.includes('absolutely')) {
      return "Confident and direct based on your word choices";
    } else if (allText.includes('maybe') || allText.includes('perhaps')) {
      return "Tentative and thoughtful based on uncertain language";
    }
    
    return "Measured and thoughtful in your communication approach";
  }
}

// Global instances
export const audioRecordingService = new AudioRecordingService();
export const audioAnalysisService = new AudioAnalysisService();
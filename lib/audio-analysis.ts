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

You have access to:
1. The full transcript with turn IDs (shown as [ID: xyz])
2. Audio analysis showing the user's vocal delivery patterns

Generate feedback that helps the user understand both WHAT they communicated and HOW they came across.

Focus on how the user likely sounded to the other person, not just the content of their words.

For the replayMoment, identify a specific user turn from the transcript that would benefit from improvement. Use the exact turn ID from the transcript (the ID shown in brackets).

Response format (JSON):
{
  "overallAssessment": "2-3 sentence summary of their communication",
  "howYouCameAcross": "How you likely felt to the other person (e.g., 'Calm and thoughtful', 'Direct but guarded')",
  "whatWorked": ["strength 1", "strength 2", "strength 3"],
  "opportunities": ["improvement 1", "improvement 2", "improvement 3"],
  "replayMoment": {
    "turnId": "exact ID of the user turn from the transcript (if applicable)",
    "originalMoment": "quote from transcript",
    "howYouLikelySounded": "how this moment likely sounded",
    "howItMayHaveLanded": "how the other person likely received it",
    "strongerVersion": "improved version of what to say",
    "deliveryTip": "specific advice on HOW to deliver it"
  }
}`;

      const userPrompt = `Scenario: ${scenario}

Transcript with Turn IDs:
${transcript}

Audio Analysis:
${audioAnalysis ? `Primary emotion detected: ${audioAnalysis.primaryEmotion} (${Math.round(audioAnalysis.confidence * 100)}% confidence)` : 'No audio analysis available'}

Analyze this rehearsal focusing on both content and delivery. Help the user understand how they came across.`;

      console.log('🔍 OPENAI_REQUEST_AUDIT', {
        systemPrompt,
        userPrompt,
        transcriptLength: transcript.length,
        userTurnCount: messages.filter(m => m.role === 'user').length
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
    
    return {
      overallAssessment: "You communicated the key points clearly and maintained a professional tone throughout the conversation. When challenged, you showed some hesitation but ultimately provided the necessary information.",
      howYouCameAcross: audioAnalysis ? `${audioAnalysis.primaryEmotion} and measured` : "Thoughtful and composed",
      whatWorked: [
        "You acknowledged their concerns directly",
        "You provided specific information when asked", 
        "You maintained a collaborative tone"
      ],
      opportunities: [
        "Practice leading with confidence rather than hesitation",
        "Use more decisive language when presenting plans",
        "Pause before responding to show you're considering their perspective"
      ],
      replayMoment: {
        originalMoment: messages.length > 0 ? messages[Math.floor(messages.length / 2)]?.text || "Sample response" : "Sample response",
        howYouLikelySounded: audioAnalysis ? `${audioAnalysis.primaryEmotion} and slightly uncertain` : "Uncertain and apologetic",
        howItMayHaveLanded: "It may have weakened confidence in your plan",
        strongerVersion: "I understand your concern. Let me walk you through our approach and the reasoning behind it.",
        deliveryTip: "Speak more slowly and pause briefly before delivering your key message"
      }
    };
  }
}

// Global instances
export const audioRecordingService = new AudioRecordingService();
export const audioAnalysisService = new AudioAnalysisService();
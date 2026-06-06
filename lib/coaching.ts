import { ValenceResponse } from './valence';

export interface ReplayMoment {
  originalResponse: string;
  interpretation: string;
  improvedResponse: string;
  expectedImpact: string;
}

export interface EmotionalInsights {
  confidenceTrend: string;
  anxietyMoments: string[];
  defensivenessMoments: string[];
}

export interface CoachingResponse {
  summary: string;
  strengths: string[];
  opportunities: string[];
  replayMoment: ReplayMoment;
  emotionalInsights: EmotionalInsights;
}

export interface AnalysisRequest {
  scenario: string;
  transcript: Array<{
    speaker: string;
    text: string;
  }>;
  emotionData: ValenceResponse;
}

export async function generateCoaching(data: AnalysisRequest): Promise<CoachingResponse> {
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const systemPrompt = `You are an expert communication coach specializing in difficult conversations and emotional intelligence. Analyze conversation transcripts along with emotion data to provide actionable coaching feedback.

Focus on:
- Confidence building
- Clarity in communication
- Empathy and emotional awareness
- Assertiveness without aggression
- Handling objections effectively
- Emotional regulation

Avoid generic advice. Reference specific moments from the transcript and emotion data.`;

  const userPrompt = `Analyze this conversation practice session:

SCENARIO: ${data.scenario}

TRANSCRIPT:
${data.transcript.map(msg => `${msg.speaker.toUpperCase()}: ${msg.text}`).join('\n')}

EMOTION DATA:
Dominant Emotion: ${data.emotionData.summary.dominant_emotion}
Average Valence: ${data.emotionData.summary.average_valence}
Average Arousal: ${data.emotionData.summary.average_arousal}

Emotion Timeline:
${data.emotionData.predictions.map(p => `${p.timestamp}s: ${p.emotion} (confidence: ${p.confidence})`).join('\n')}

Please provide coaching feedback in the following JSON structure:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["specific strengths demonstrated", "reference actual moments"],
  "opportunities": ["specific areas for improvement", "actionable advice"],
  "replayMoment": {
    "originalResponse": "exact quote from transcript",
    "interpretation": "how it likely came across",
    "improvedResponse": "better alternative response",
    "expectedImpact": "why this would be more effective"
  },
  "emotionalInsights": {
    "confidenceTrend": "description of confidence patterns",
    "anxietyMoments": ["timestamps or quotes where anxiety was detected"],
    "defensivenessMoments": ["timestamps or quotes where defensiveness was detected"]
  }
}`;

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
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error('Error generating coaching feedback:', error);
    
    // Fallback mock data for development/testing
    return {
      summary: "You showed good engagement throughout the conversation. Focus on building more confidence in your responses.",
      strengths: [
        "Maintained active listening throughout",
        "Asked clarifying questions at key moments",
        "Stayed calm under pressure"
      ],
      opportunities: [
        "Lead with more confidence in your statements",
        "Use more assertive language when presenting solutions",
        "Address concerns more directly rather than deflecting"
      ],
      replayMoment: {
        originalResponse: "I think maybe we could look into that...",
        interpretation: "Sounds uncertain and lacking conviction",
        improvedResponse: "Let me share our specific plan for addressing this concern.",
        expectedImpact: "Demonstrates leadership and builds confidence"
      },
      emotionalInsights: {
        confidenceTrend: "Started nervous but gained confidence midway through the conversation",
        anxietyMoments: ["Beginning of conversation showed elevated stress"],
        defensivenessMoments: ["Became defensive when budget concerns were raised"]
      }
    };
  }
}
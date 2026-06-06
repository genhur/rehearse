import { analyzeEmotionFromAudio, ValenceResponse } from './valence';
import { generateCoaching, CoachingResponse } from './coaching';

export interface AnalysisResult {
  coaching: CoachingResponse;
  emotionData: ValenceResponse;
}

export async function analyzeSession(
  scenario: string,
  transcript: Array<{ speaker: string; text: string }>,
  audioFile: File
): Promise<AnalysisResult> {
  try {
    // Step 1: Analyze emotion from audio
    console.log('[Analysis] Starting emotion analysis...');
    const emotionData = await analyzeEmotionFromAudio(audioFile);
    
    // Step 2: Generate coaching feedback
    console.log('[Analysis] Generating coaching feedback...');
    const coaching = await generateCoaching({
      scenario,
      transcript,
      emotionData
    });
    
    return {
      coaching,
      emotionData
    };
  } catch (error) {
    console.error('[Analysis] Error analyzing session:', error);
    throw error;
  }
}

// Mock transcript getter - TODO: Replace with actual ElevenLabs transcript extraction
export function getMockTranscript(): Array<{ speaker: string; text: string }> {
  return [
    {
      speaker: 'agent',
      text: "Hi there! I understand you wanted to discuss our company's runway situation. I appreciate you making time for this important conversation."
    },
    {
      speaker: 'user', 
      text: "Yes, I've been looking at the numbers and I'm concerned. It looks like we might only have 6 months of runway left."
    },
    {
      speaker: 'agent',
      text: "I can see why that would be concerning. Let me share some additional context that might help clarify the situation."
    },
    {
      speaker: 'user',
      text: "I think maybe we could look into some cost cutting measures, but I'm not sure if that's enough."
    },
    {
      speaker: 'agent', 
      text: "What specific areas do you think we should focus on for cost reduction?"
    },
    {
      speaker: 'user',
      text: "Well, we could reduce our marketing spend and maybe delay some hiring plans. But honestly, I'm worried this might not be sustainable long-term."
    }
  ];
}
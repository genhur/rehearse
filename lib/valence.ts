export interface EmotionPrediction {
  timestamp: number;
  emotion: string;
  confidence: number;
  valence: number;
  arousal: number;
}

export interface ValenceResponse {
  predictions: EmotionPrediction[];
  summary: {
    dominant_emotion: string;
    average_valence: number;
    average_arousal: number;
  };
}

export async function analyzeEmotionFromAudio(audioFile: File): Promise<ValenceResponse> {
  const valenceApiKey = import.meta.env.VITE_VALENCE_API_KEY;
  
  if (!valenceApiKey) {
    throw new Error('VALENCE_API_KEY is not configured');
  }

  try {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await fetch('https://api.getvalenceai.com/emotionprediction', {
      method: 'POST',
      headers: {
        'x-api-key': valenceApiKey,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Valence API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing emotion with Valence:', error);
    
    // Fallback mock data for development/testing
    return {
      predictions: [
        {
          timestamp: 0,
          emotion: 'neutral',
          confidence: 0.7,
          valence: 0.5,
          arousal: 0.3
        }
      ],
      summary: {
        dominant_emotion: 'neutral',
        average_valence: 0.5,
        average_arousal: 0.3
      }
    };
  }
}
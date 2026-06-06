// app/api/analyze/route.ts
// This is an example of how to implement this in Next.js when you migrate

import { NextRequest, NextResponse } from 'next/server';
import { analyzeEmotionFromAudio } from '../../../lib/valence';
import { generateCoaching } from '../../../lib/coaching';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const scenario = formData.get('scenario') as string;
    const transcriptData = formData.get('transcript') as string;
    const audioFile = formData.get('audio') as File;
    
    if (!scenario || !transcriptData || !audioFile) {
      return NextResponse.json(
        { error: 'Missing required fields: scenario, transcript, audio' },
        { status: 400 }
      );
    }
    
    const transcript = JSON.parse(transcriptData);
    
    // Step 1: Analyze emotion from audio using Valence
    const emotionData = await analyzeEmotionFromAudio(audioFile);
    
    // Step 2: Generate coaching feedback using OpenAI
    const coaching = await generateCoaching({
      scenario,
      transcript,
      emotionData
    });
    
    return NextResponse.json({
      coaching,
      emotionData
    });
    
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

// Example usage from frontend:
/*
const formData = new FormData();
formData.append('scenario', scenario);
formData.append('transcript', JSON.stringify(transcript));
formData.append('audio', audioFile);

const response = await fetch('/api/analyze', {
  method: 'POST',
  body: formData
});

const result = await response.json();
*/
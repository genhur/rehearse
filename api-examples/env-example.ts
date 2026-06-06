// .env.local for Next.js
// These environment variables would be server-side only (not exposed to browser)

OPENAI_API_KEY=your_openai_api_key_here
VALENCE_API_KEY=your_valence_api_key_here

// The lib files would need to be updated to use these server-side env vars:
// const openaiApiKey = process.env.OPENAI_API_KEY;
// const valenceApiKey = process.env.VALENCE_API_KEY;
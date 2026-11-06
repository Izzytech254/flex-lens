import { GoogleGenAI } from '@google/genai';

// Initialize the GoogleGenAI instance with server-side environment key and required telemetry header
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Prioritize gemini-2.5-flash and gemini-3.1-flash-lite for fast, robust multimodal vision
export async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
}) {
  const models = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: params.responseMimeType,
        },
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

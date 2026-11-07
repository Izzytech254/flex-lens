import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return client;
}

// Override with GEMINI_MODELS="model-a,model-b" if these names change.
const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function getModels(): string[] {
  const fromEnv = process.env.GEMINI_MODELS?.split(',').map((m) => m.trim()).filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
}

// Errors caused by the request itself will fail on every model, so don't retry them.
function isNonRetryable(err: any): boolean {
  const status = err?.status ?? err?.code;
  return status === 400 || status === 401 || status === 403;
}

export async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
}) {
  const ai = getClient();
  let lastError: any = null;

  for (const model of getModels()) {
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: params.responseMimeType,
        },
      });
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed:`, err?.message || err);
      lastError = err;
      if (isNonRetryable(err)) break;
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

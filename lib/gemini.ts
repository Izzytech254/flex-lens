import { GoogleGenAI, Modality } from '@google/genai';

/** Thrown when the server has no usable Gemini API key. Safe to show to users. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('FixLens is not set up yet: the Gemini API key is missing on the server.');
    this.name = 'MissingApiKeyError';
  }
}

function errorStatus(err: any): number | undefined {
  const s = err?.status ?? err?.code;
  return typeof s === 'number' ? s : undefined;
}

function errorText(err: any): string {
  return String(err?.message || err || '');
}

function isInvalidKeyError(err: any): boolean {
  const msg = errorText(err);
  return /API[_ ]?KEY[_ ]?INVALID|API key not valid|invalid api key|UNAUTHENTICATED|API keys are not supported/i.test(msg);
}

/** Maps known AI failures to a user-facing message. In development, unknown errors include details. */
export function aiErrorResponseInit(error: unknown): { message: string; status: number } | null {
  if (error instanceof MissingApiKeyError) return { message: error.message, status: 503 };
  const status = errorStatus(error);
  if (isInvalidKeyError(error) || status === 401 || status === 403) {
    return {
      message:
        'The Gemini API key on the server was rejected. Check that it is valid and has access to the Gemini API (or set GEMINI_USE_VERTEXAI=true for a Vertex AI key).',
      status: 503,
    };
  }
  if (status === 429) {
    return { message: 'The AI service is busy or over its quota. Please try again shortly.', status: 503 };
  }
  if (process.env.NODE_ENV !== 'production') {
    return { message: `AI request failed (dev details): ${errorText(error).slice(0, 400)}`, status: 500 };
  }
  return null;
}

// --- Clients ---------------------------------------------------------------

const clients: { studio?: GoogleGenAI; vertex?: GoogleGenAI } = {};

function getKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') throw new MissingApiKeyError();
  return key;
}

function getClient(useVertex: boolean): GoogleGenAI {
  const key = getKey();
  const slot = useVertex ? 'vertex' : 'studio';
  if (!clients[slot]) {
    clients[slot] = new GoogleGenAI({
      apiKey: key,
      // Vertex AI express-mode keys need the Vertex endpoint; AI Studio keys use the default.
      vertexai: useVertex,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return clients[slot]!;
}

// GEMINI_USE_VERTEXAI=true forces Vertex, =false forces AI Studio; unset = auto-detect.
const vertexSetting = process.env.GEMINI_USE_VERTEXAI;
let preferVertex = vertexSetting === 'true';
const canAutoSwitch = vertexSetting !== 'true' && vertexSetting !== 'false';

// Override with GEMINI_MODELS="model-a,model-b" if these names change.
// 2.5 models are kept last only for older keys that still have access.
const DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

// Models that returned 404 (retired / not available to this key) are skipped for the rest of the process.
const unavailableModels = new Set<string>();

function getModels(preferFast = false): string[] {
  const fromEnv = process.env.GEMINI_MODELS?.split(',').map((m) => m.trim()).filter(Boolean);
  let list = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
  if (preferFast) {
    // Lower-latency "lite" models first for frequent live checks.
    list = [...list.filter((m) => /lite/i.test(m)), ...list.filter((m) => !/lite/i.test(m))];
  }
  const usable = list.filter((m) => !unavailableModels.has(m));
  // If everything was marked unavailable, try the full list again rather than failing outright.
  return usable.length > 0 ? usable : list;
}

async function tryModels(useVertex: boolean, params: GenerateParams) {
  const ai = getClient(useVertex);
  let lastError: any = null;

  for (const model of getModels(params.preferFast)) {
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
      console.warn(`[gemini] ${useVertex ? 'vertex' : 'studio'} model ${model} failed:`, errorText(err));
      lastError = err;
      if (errorStatus(err) === 404 || /NOT_FOUND|no longer available/i.test(errorText(err))) {
        unavailableModels.add(model);
      }
      // Key/auth problems fail on every model, so stop early.
      if (isInvalidKeyError(err) || errorStatus(err) === 401 || errorStatus(err) === 403) break;
    }
  }
  throw lastError || new Error('All model attempts failed.');
}

type GenerateParams = {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  /** Try faster "lite" models first (used for frequent live camera checks). */
  preferFast?: boolean;
};

// ---- Text-to-speech -------------------------------------------------------

// Override with GEMINI_TTS_MODELS="model-a,model-b". Models that 404 are skipped automatically,
// and the dev error message shows Google's suggested replacement if all fail.
const DEFAULT_TTS_MODELS = [
  'gemini-3.5-flash-tts',
  'gemini-3.5-flash-preview-tts',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-flash-tts',
];

/** Generates spoken audio for `text`. Returns base64 audio (usually 16-bit PCM at 24 kHz) and its mime type. */
export async function generateSpeech(text: string, voiceName: string): Promise<{ data: string; mimeType: string }> {
  const fromEnv = process.env.GEMINI_TTS_MODELS?.split(',').map((m) => m.trim()).filter(Boolean);
  const list = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_TTS_MODELS;
  const usable = list.filter((m) => !unavailableModels.has(m));
  const models = usable.length > 0 ? usable : list;

  let lastError: any = null;
  for (const model of models) {
    try {
      const ai = getClient(preferVertex);
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new Error('The TTS model returned no audio.');
      return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/L16;rate=24000' };
    } catch (err: any) {
      console.warn(`[gemini-tts] model ${model} failed:`, errorText(err));
      lastError = err;
      if (errorStatus(err) === 404 || /NOT_FOUND|no longer available/i.test(errorText(err))) unavailableModels.add(model);
      if (isInvalidKeyError(err) || errorStatus(err) === 401 || errorStatus(err) === 403) break;
    }
  }
  throw lastError || new Error('All TTS model attempts failed.');
}

export async function generateContentWithFallback(params: GenerateParams) {
  try {
    return await tryModels(preferVertex, params);
  } catch (err: any) {
    // An AI Studio endpoint rejecting the key often means it's a Vertex AI express key (and vice versa).
    const authProblem = isInvalidKeyError(err) || errorStatus(err) === 401 || errorStatus(err) === 403;
    if (!canAutoSwitch || !authProblem) throw err;

    console.warn(`[gemini] key rejected by ${preferVertex ? 'Vertex AI' : 'AI Studio'}; retrying with the other endpoint`);
    const result = await tryModels(!preferVertex, params);
    preferVertex = !preferVertex; // remember what worked
    return result;
  }
}

// Google Cloud Text-to-Speech (separate from Gemini, with its own free monthly allowance).
// Uses GOOGLE_TTS_API_KEY, or falls back to GEMINI_API_KEY if that key's Google Cloud project
// has the "Cloud Text-to-Speech API" enabled.
// Docs: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize

// Chirp 3 HD voices are Google's most natural; Neural2 is a reliable fallback.
// Override with GOOGLE_TTS_VOICE (e.g. "en-US-Chirp3-HD-Aoede" for a female voice).
const DEFAULT_VOICES = ['en-US-Chirp3-HD-Charon', 'en-US-Neural2-D'];

// Only used when a dedicated key is set, so requests don't fail (and add delay) on projects
// where the Cloud Text-to-Speech API isn't enabled.
function apiKey(): string | null {
  const key = (process.env.GOOGLE_TTS_API_KEY || '').trim();
  return key && key !== 'MY_GOOGLE_CLOUD_API_KEY' ? key : null;
}

export function googleTtsConfigured(): boolean {
  return process.env.GOOGLE_TTS_DISABLED !== 'true' && !!apiKey();
}

export class GoogleTtsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GoogleTtsError';
    this.status = status;
  }
}

/** Returns MP3 audio for `text`. Throws GoogleTtsError on failure (caller falls back). */
export async function googleCloudSpeech(text: string): Promise<Buffer> {
  const key = apiKey();
  if (!key) throw new GoogleTtsError('No Google API key configured for Cloud Text-to-Speech.', 500);

  const configured = process.env.GOOGLE_TTS_VOICE?.trim();
  const voices = configured ? [configured] : DEFAULT_VOICES;
  // Chirp 3 HD reads "..." as a natural pause already; keep plain text.
  const input = { text };

  let lastError: GoogleTtsError | null = null;
  for (const name of voices) {
    const languageCode = name.split('-').slice(0, 2).join('-') || 'en-US';
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        voice: { languageCode, name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (res.ok) {
      const data = (await res.json()) as { audioContent?: string };
      if (!data.audioContent) throw new GoogleTtsError('Google Cloud TTS returned no audio.', 502);
      return Buffer.from(data.audioContent, 'base64');
    }

    let detail = '';
    try {
      detail = (await res.text()).slice(0, 400);
    } catch {
      // ignore
    }
    lastError = new GoogleTtsError(`Google Cloud TTS ${res.status} (${name}): ${detail}`, res.status);
    // Only try the next voice if this one was rejected as invalid/unavailable; auth/quota errors won't improve.
    if (res.status !== 400 && res.status !== 404) break;
  }
  throw lastError || new GoogleTtsError('Google Cloud TTS failed.', 500);
}

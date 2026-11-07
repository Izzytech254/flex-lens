// ElevenLabs text-to-speech: the most natural-sounding voice provider FixLens supports.
// Enabled when ELEVENLABS_API_KEY is set. Docs: https://elevenlabs.io/docs/api-reference/text-to-speech

// "George" — a warm, calm narration voice from the ElevenLabs default library. Override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
// Flash v2.5: lowest latency (good for live guidance) and cheaper per character. Override with ELEVENLABS_MODEL,
// e.g. "eleven_multilingual_v2" for maximum quality.
const DEFAULT_MODEL = 'eleven_flash_v2_5';

export function elevenLabsConfigured(): boolean {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return !!key && key !== 'MY_ELEVENLABS_API_KEY';
}

export class ElevenLabsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ElevenLabsError';
    this.status = status;
  }
}

/** Returns MP3 audio for `text`. Throws ElevenLabsError on failure (caller falls back to another provider). */
export async function elevenLabsSpeech(text: string): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
  const model = process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_MODEL;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!.trim(),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        // Calm, steady technician delivery.
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(25_000),
    }
  );

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      // ignore
    }
    throw new ElevenLabsError(`ElevenLabs ${res.status}: ${detail}`, res.status);
  }

  return Buffer.from(await res.arrayBuffer());
}

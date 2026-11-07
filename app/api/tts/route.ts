import { NextRequest, NextResponse } from 'next/server';
import { aiErrorResponseInit, generateSpeech } from '@/lib/gemini';
import { rateLimit } from '@/lib/rate-limit';
import { readJsonBody } from '@/lib/api-utils';
import { elevenLabsConfigured, elevenLabsSpeech } from '@/lib/tts-elevenlabs';
import { googleCloudSpeech, googleTtsConfigured } from '@/lib/tts-google';
import { edgeSpeech, edgeTtsEnabled } from '@/lib/tts-edge';

export const maxDuration = 60;

// Natural-sounding voice for FixLens guidance (works on every OS, unlike browser voices).
// Provider order: Edge neural voices (free) → Google Cloud TTS (if GOOGLE_TTS_API_KEY) →
// ElevenLabs (if ELEVENLABS_API_KEY) → Gemini TTS → (client falls back to the browser voice).
// Change with GEMINI_TTS_VOICE (e.g. Kore, Puck, Charon, Aoede).
const VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';
const MAX_CHARS = 1500;

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'tts', 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many voice requests.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  const failures: string[] = [];
  try {
    const body = (await readJsonBody(req)) ?? {};
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS) : '';
    if (!text) return NextResponse.json({ error: 'Text is required.' }, { status: 400 });

    // 1) Free: Microsoft Edge neural voices (no key, no billing).
    if (edgeTtsEnabled()) {
      try {
        const mp3 = await edgeSpeech(text);
        return new NextResponse(new Uint8Array(mp3), {
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600', 'X-TTS-Provider': 'edge' },
        });
      } catch (err: any) {
        failures.push(`Edge TTS: ${err?.message || String(err)}`);
        console.warn('[tts] Edge TTS failed, trying next provider:', err?.message || err);
      }
    }

    // 2) Google Cloud Text-to-Speech (only when GOOGLE_TTS_API_KEY is set).
    if (googleTtsConfigured()) {
      try {
        const mp3 = await googleCloudSpeech(text);
        return new NextResponse(new Uint8Array(mp3), {
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600', 'X-TTS-Provider': 'google-cloud' },
        });
      } catch (err: any) {
        failures.push(err?.message || String(err));
        console.warn('[tts] Google Cloud TTS failed, trying next provider:', err?.message || err);
      }
    }

    // 3) ElevenLabs (when configured). On failure, fall through to Gemini.
    let elevenLabsError: string | null = null;
    if (elevenLabsConfigured()) {
      try {
        const mp3 = await elevenLabsSpeech(text);
        return new NextResponse(new Uint8Array(mp3), {
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600', 'X-TTS-Provider': 'elevenlabs' },
        });
      } catch (err: any) {
        elevenLabsError = err?.message || String(err);
        failures.push(elevenLabsError || 'ElevenLabs failed');
        console.warn('[tts] ElevenLabs failed, falling back to Gemini:', elevenLabsError);
      }
    }

    // 4) Gemini TTS. A short style direction makes the voice sound like a calm human technician.
    const prompt = `Say in a calm, warm, friendly voice, like a helpful technician sitting next to a friend, pausing briefly at each "...": ${text}`;
    const { data, mimeType } = await generateSpeech(prompt, VOICE);
    const audio = Buffer.from(data, 'base64');

    // Already a playable container? Return as-is. Otherwise wrap raw PCM in a WAV header.
    if (/audio\/(wav|x-wav|mpeg|mp3|ogg|webm)/i.test(mimeType)) {
      return new NextResponse(new Uint8Array(audio), {
        headers: { 'Content-Type': mimeType.split(';')[0], 'Cache-Control': 'private, max-age=3600' },
      });
    }
    const rate = Number(/rate=(\d+)/i.exec(mimeType)?.[1]) || 24000;
    const wav = pcmToWav(audio, rate);
    return new NextResponse(new Uint8Array(wav), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    const known = aiErrorResponseInit(error);
    // In development, show why each earlier provider failed too.
    const prefix =
      process.env.NODE_ENV !== 'production' && failures.length > 0 ? `[Earlier providers failed: ${failures.join(' | ')}] ` : '';
    if (known) return NextResponse.json({ error: prefix + known.message }, { status: known.status });
    return NextResponse.json({ error: prefix + 'Voice generation failed.' }, { status: 500 });
  }
}

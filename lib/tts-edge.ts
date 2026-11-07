// Free natural voice: Microsoft Edge "Read aloud" neural voices via the open-source `msedge-tts` package.
// No API key or billing needed. Note: this uses Edge's online voice service, which has no official
// public API — it can change without notice, so other providers stay configured as fallbacks.
// Disable with EDGE_TTS_DISABLED=true. Change voice with EDGE_TTS_VOICE (e.g. en-US-AriaNeural).

const DEFAULT_VOICES = ['en-US-AndrewMultilingualNeural', 'en-US-GuyNeural'];

export function edgeTtsEnabled(): boolean {
  return process.env.EDGE_TTS_DISABLED !== 'true';
}

function collect(stream: any, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) reject(err);
      else if (chunks.length === 0) reject(new Error('Edge TTS returned no audio.'));
      else resolve(Buffer.concat(chunks));
    };
    const timer = setTimeout(() => finish(new Error('Edge TTS timed out.')), timeoutMs);
    stream.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => finish());
    stream.on('close', () => finish());
    stream.on('error', (e: any) => finish(e instanceof Error ? e : new Error(String(e))));
  });
}

/** The text is placed inside SSML (XML) by the library, so XML special characters must be escaped. */
function escapeForSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Streaming version: resolves as soon as the FIRST audio chunk arrives (so playback can start
 * immediately) with a web ReadableStream of MP3 bytes. Rejects if no audio arrives in time.
 */
export async function edgeSpeechStream(rawText: string, firstChunkTimeoutMs = 6000): Promise<ReadableStream<Uint8Array>> {
  const text = escapeForSsml(rawText);
  const mod: any = await import('msedge-tts');
  const MsEdgeTTS = mod.MsEdgeTTS ?? mod.default?.MsEdgeTTS;
  const OUTPUT_FORMAT = mod.OUTPUT_FORMAT ?? mod.default?.OUTPUT_FORMAT;
  if (!MsEdgeTTS || !OUTPUT_FORMAT) throw new Error('msedge-tts is not installed correctly.');

  const configured = process.env.EDGE_TTS_VOICE?.trim();
  const voices = configured ? [configured] : DEFAULT_VOICES;

  let lastError: any = null;
  for (const voice of voices) {
    const tts = new MsEdgeTTS();
    const closeTts = () => {
      try {
        tts.close?.();
      } catch {
        // ignore
      }
    };
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const result = await tts.toStream(text);
      const stream = result?.audioStream ?? result;
      if (!stream || typeof stream.on !== 'function') throw new Error('Edge TTS returned no audio stream.');

      return await new Promise<ReadableStream<Uint8Array>>((resolve, reject) => {
        let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
        let started = false;
        let finished = false;
        const web = new ReadableStream<Uint8Array>({
          start(c) {
            controller = c;
          },
          cancel() {
            finished = true;
            try {
              stream.destroy?.();
            } catch {
              // ignore
            }
            closeTts();
          },
        });
        const timer = setTimeout(() => {
          if (!started) {
            finished = true;
            closeTts();
            reject(new Error('Edge TTS: no audio arrived in time.'));
          }
        }, firstChunkTimeoutMs);
        const end = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          closeTts();
          if (!started) reject(new Error('Edge TTS returned no audio.'));
          else
            try {
              controller?.close();
            } catch {
              // ignore
            }
        };
        stream.on('data', (chunk: any) => {
          if (finished) return;
          const bytes = new Uint8Array(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          controller?.enqueue(bytes);
          if (!started) {
            started = true;
            clearTimeout(timer);
            resolve(web);
          }
        });
        stream.on('end', end);
        stream.on('close', end);
        stream.on('error', (e: any) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          closeTts();
          if (!started) reject(e instanceof Error ? e : new Error(String(e)));
          else
            try {
              controller?.error(e);
            } catch {
              // ignore
            }
        });
      });
    } catch (err) {
      lastError = err;
      closeTts();
      console.warn(`[tts-edge] stream with voice ${voice} failed:`, (err as any)?.message || err);
    }
  }
  throw lastError || new Error('Edge TTS failed.');
}

/** Returns MP3 audio for `text` using a Microsoft Edge neural voice. Throws on failure (caller falls back). */
export async function edgeSpeech(rawText: string): Promise<Buffer> {
  const text = escapeForSsml(rawText);
  const mod: any = await import('msedge-tts');
  const MsEdgeTTS = mod.MsEdgeTTS ?? mod.default?.MsEdgeTTS;
  const OUTPUT_FORMAT = mod.OUTPUT_FORMAT ?? mod.default?.OUTPUT_FORMAT;
  if (!MsEdgeTTS || !OUTPUT_FORMAT) throw new Error('msedge-tts is not installed correctly.');

  const configured = process.env.EDGE_TTS_VOICE?.trim();
  const voices = configured ? [configured] : DEFAULT_VOICES;

  let lastError: any = null;
  for (const voice of voices) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      // Current versions: `await tts.toStream()` resolves to { audioStream, metadataStream }.
      // Older versions returned the stream synchronously — `await` handles both.
      const result = await tts.toStream(text);
      const stream = result?.audioStream ?? result;
      if (!stream || typeof stream.on !== 'function') throw new Error('Edge TTS returned no audio stream.');
      return await collect(stream, 30_000);
    } catch (err) {
      lastError = err;
      console.warn(`[tts-edge] voice ${voice} failed:`, (err as any)?.message || err);
    } finally {
      try {
        tts.close?.();
      } catch {
        // ignore
      }
    }
  }
  throw lastError || new Error('Edge TTS failed.');
}

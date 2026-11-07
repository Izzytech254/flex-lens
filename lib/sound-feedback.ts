// lib/sound-feedback.ts
// Bulletproof sound feedback engine: Web Audio API synthesized chimes + SpeechSynthesis voice guidance

class SoundFeedbackEngine {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private voiceCache: SpeechSynthesisVoice | null = null;
  private onSpeakingChangeCallbacks: Set<(isSpeaking: boolean) => void> = new Set();
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.enabled = window.localStorage.getItem('fixlens_sound_enabled') !== 'false';
      } catch {
        // localStorage unavailable (private mode etc.)
      }

      // Load voices when available
      if ('speechSynthesis' in window) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          this.loadBestVoice();
        });
        this.loadBestVoice();
      }

      // Automatically unlock audio on first user touch/click anywhere on page. This must run inside a
      // real user gesture: browsers (especially iOS Safari) only allow later audio playback after that.
      const unlockHandler = () => {
        this.unlockAudio();
        this.unlockMediaElement();
        window.removeEventListener('pointerdown', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
      };
      window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
      window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    }
  }

  // Ensure AudioContext and SpeechSynthesis are primed and unlocked by user gesture
  public unlockAudio(): void {
    if (this.isUnlocked || typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Resume speech synthesis if stalled
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }

      this.isUnlocked = true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  // Load cleanest natural English voice
  private loadBestVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prefer high-quality natural voices
    const preferredNames = [
      'Google US English',
      'Samantha',
      'Daniel',
      'Microsoft David',
      'Microsoft Mark',
      'Microsoft Zira',
      'Karen',
      'Alex',
      'Natural',
    ];

    for (const name of preferredNames) {
      const found = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'));
      if (found) {
        this.voiceCache = found;
        return found;
      }
    }

    // Fallback to any English voice
    const anyEn = voices.find((v) => v.lang.startsWith('en'));
    this.voiceCache = anyEn || voices[0] || null;
    return this.voiceCache;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Globally enable/disable sound effects and voice narration (persisted per device)
  public setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.stop();
    try {
      window.localStorage.setItem('fixlens_sound_enabled', String(value));
    } catch {
      // ignore
    }
  }

  // Register state listener for active speaking state (for animated sound waves)
  public subscribeSpeaking(callback: (isSpeaking: boolean) => void): () => void {
    this.onSpeakingChangeCallbacks.add(callback);
    return () => {
      this.onSpeakingChangeCallbacks.delete(callback);
    };
  }

  private notifySpeakingState(speaking: boolean) {
    this.speakingNow = speaking;
    this.onSpeakingChangeCallbacks.forEach((cb) => {
      try {
        cb(speaking);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Synthesize instant auditory sound effects using Web Audio API oscillators
  public playSoundEffect(type: 'detect' | 'success' | 'alert' | 'step' | 'click' | 'chime'): void {
    if (typeof window === 'undefined' || !this.enabled) return;
    try {
      this.unlockAudio();
      const ctx = this.audioCtx;
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'detect') {
        // High-tech optical error lock-on chime: 660Hz -> 990Hz -> 1320Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.22);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        // Triumphant ascending triad: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      } else if (type === 'alert') {
        // Warning 2-tone alert: 520Hz -> 380Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(380, now + 0.12);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'step') {
        // Subtle affirmative advance chirp: 880Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'click') {
        // Tactile micro-click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (err) {
      console.warn('Sound effect error:', err);
    }
  }

  // ------------------------------------------------------------------ speech

  /** Increments on every speak()/stop() so callbacks from cancelled speech are ignored. */
  private session = 0;
  private activeUtterances: SpeechSynthesisUtterance[] = [];
  private lastError: string | null = null;

  /** Splits text into short chunks (by "..." beats and sentences) so long speech never hits
   *  Chrome's ~15s cutoff and each beat gets a natural pause. */
  private chunkText(text: string): string[] {
    const clean = text
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // markdown code
      .replace(/[*_~#]/g, '') // markdown formatting
      .replace(/\s+/g, ' ')
      .trim();
    const beats = clean.split(/\s*(?:\.\.\.|…)\s*/).map((b) => b.trim()).filter(Boolean);
    const chunks: string[] = [];
    for (const beat of beats) {
      if (beat.length <= 180) {
        chunks.push(beat);
        continue;
      }
      // Split long beats on sentence boundaries, then hard-wrap if still too long.
      let current = '';
      const sentences = beat.match(/[^.!?]+[.!?]*\s*/g) || [beat];
      for (const raw of sentences) {
        const sentence = raw.trim();
        if ((current + ' ' + sentence).trim().length > 180 && current) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current = `${current} ${sentence}`;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
    return chunks;
  }

  /** Waits (briefly) for the browser to load its voice list — it's empty on first page load. */
  private waitForVoices(timeoutMs = 1200): Promise<void> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (synth.getVoices().length > 0) return resolve();
      const done = () => {
        synth.removeEventListener('voiceschanged', done);
        resolve();
      };
      synth.addEventListener('voiceschanged', done);
      setTimeout(done, timeoutMs);
    });
  }

  /** Speech support info for the UI (e.g. to explain "no voices installed" on Linux). */
  public getSpeechStatus(): { supported: boolean; voiceCount: number; lastError: string | null } {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { supported: false, voiceCount: 0, lastError: this.lastError };
    }
    return { supported: true, voiceCount: window.speechSynthesis.getVoices().length, lastError: this.lastError };
  }

  // ---- Natural cloud voice (Gemini TTS via /api/tts) ----
  private audioEl: HTMLAudioElement | null = null;
  private audioCache = new Map<string, string>(); // text -> object URL
  private cloudDownUntil = 0;
  private pending = false; // speech requested but not yet audible (e.g. fetching audio)
  private speakingNow = false;

  /** True while FixLens is talking or about to talk. Use to avoid interrupting it. */
  public isBusy(): boolean {
    return this.pending || this.speakingNow;
  }

  // One queued utterance, spoken as soon as the current one finishes (used so the step-by-step
  // plan follows FixLens's first quick sentence instead of cutting it off).
  private queued: { text: string; options?: { onEnd?: () => void } } | null = null;

  /** Speak now if idle; otherwise speak right after the current utterance ends. */
  public speakNext(text: string, options?: { onEnd?: () => void }): void {
    if (!this.isBusy()) {
      this.speak(text, options);
      return;
    }
    this.queued = { text, options };
  }

  private flushQueue(): void {
    const q = this.queued;
    this.queued = null;
    if (q) setTimeout(() => this.speak(q.text, q.options), 150);
  }

  private mediaUnlocked = false;

  /**
   * Plays a silent clip on the shared <audio> element during the user's first gesture, so the
   * natural-voice clips (which start after a network request, outside any gesture) are allowed to play.
   */
  private unlockMediaElement(): void {
    if (this.mediaUnlocked) return;
    this.mediaUnlocked = true;
    try {
      const el = this.getAudioEl();
      if (!el.src) {
        el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        el.play()?.catch(() => {
          // Ignore: some browsers reject the empty clip; the gesture still counts as user activation.
        });
      }
    } catch {
      // ignore
    }
  }

  private getAudioEl(): HTMLAudioElement {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.preload = 'auto';
    }
    return this.audioEl;
  }

  /** Resolves the currently playing clip's promise (so a halted sequence stops waiting). */
  private playResolve: (() => void) | null = null;
  private ttsInflight = new Map<string, Promise<string | null>>();

  private haltPlayback(): void {
    if (this.audioEl) {
      this.audioEl.onplay = null;
      this.audioEl.onended = null;
      this.audioEl.onerror = null;
      try {
        this.audioEl.pause();
      } catch {
        // ignore
      }
    }
    this.playResolve?.();
    this.playResolve = null;
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  /** Fetches (or reuses) natural-voice audio for `text`. Resolves null on failure. */
  private fetchTtsUrl(text: string): Promise<string | null> {
    const cached = this.audioCache.get(text);
    if (cached) return Promise.resolve(cached);
    const inflight = this.ttsInflight.get(text);
    if (inflight) return inflight;

    const p = (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          this.lastError = `natural voice unavailable (${res.status}${data?.error ? `: ${data.error}` : ''})`;
          console.warn('[FixLens voice]', this.lastError);
          // Quota/rate limits (our API maps them to 503 or 429): back off for 5 minutes so we don't
          // keep burning requests; other errors retry after a minute. The browser voice is used meanwhile.
          const quota = res.status === 429 || res.status === 503 || /quota|busy/i.test(String(data?.error || ''));
          this.cloudDownUntil = Date.now() + (quota ? 5 * 60_000 : 60_000);
          return null;
        }
        const url = URL.createObjectURL(await res.blob());
        this.audioCache.set(text, url);
        if (this.audioCache.size > 40) {
          const oldest = this.audioCache.keys().next().value as string;
          const oldUrl = this.audioCache.get(oldest);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          this.audioCache.delete(oldest);
        }
        return url;
      } catch (err: any) {
        this.lastError = `natural voice failed: ${err?.message || err}`;
        return null;
      } finally {
        this.ttsInflight.delete(text);
      }
    })();
    this.ttsInflight.set(text, p);
    return p;
  }

  /** Plays one clip; resolves when it ends, errors, or playback is halted. Rejects if play() is blocked. */
  private playUrl(url: string, mySession: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const el = this.getAudioEl();
      const finish = () => {
        if (this.playResolve === finish) this.playResolve = null;
        resolve();
      };
      this.playResolve = finish;
      el.onplay = () => {
        if (mySession !== this.session) return;
        this.pending = false;
        this.lastError = null;
        if (!this.speakingNow) this.notifySpeakingState(true);
      };
      el.onended = finish;
      el.onerror = finish;
      el.src = url;
      el.play().catch((err) => {
        if (this.playResolve === finish) this.playResolve = null;
        reject(err);
      });
    });
  }

  /**
   * Speaks with the natural server voice. The first beat is generated separately so speech starts
   * sooner while the rest loads in parallel. Returns false if the first clip couldn't play (caller falls back).
   */
  private async speakCloud(
    chunks: string[],
    mySession: number,
    deadline: number,
    options?: { onEnd?: () => void }
  ): Promise<boolean> {
    // Speak in short pieces (~200 chars): long requests are slow and can time out, which used to
    // silently drop the explanation and steps. The next piece is fetched while the current one plays.
    const segments: string[] = [];
    let current = '';
    for (const c of chunks) {
      // Keep the very first piece short so audio starts as soon as possible.
      const limit = segments.length === 0 ? 90 : 200;
      if (current && (current + ' ... ' + c).length > limit) {
        segments.push(current);
        current = c;
      } else {
        current = current ? `${current} ... ${c}` : c;
      }
    }
    if (current) segments.push(current);

    const urls: Array<Promise<string | null>> = [];
    const prefetch = (i: number) => {
      if (i < segments.length && !urls[i]) urls[i] = this.fetchTtsUrl(segments[i]);
    };
    prefetch(0);

    try {
      for (let i = 0; i < segments.length; i++) {
        prefetch(i);
        prefetch(i + 1); // load the next piece while this one plays
        const url = await urls[i];
        if (mySession !== this.session) return true; // superseded — say nothing
        if (!url) {
          if (i === 0) return false; // fall back to the browser voice
          break; // later part failed; stop quietly rather than switching voices mid-sentence
        }
        if (i === 0 && deadline && Date.now() > deadline) {
          // Too late to be useful (e.g. a live tip about a screen that has moved on) — skip it.
          this.pending = false;
          this.flushQueue();
          return true;
        }
        await this.playUrl(url, mySession);
        if (mySession !== this.session) return true;
      }
      this.pending = false;
      this.notifySpeakingState(false);
      options?.onEnd?.();
      this.flushQueue();
      return true;
    } catch (err: any) {
      // NotAllowedError = autoplay blocked before any user interaction.
      this.lastError = `natural voice failed: ${err?.name || err?.message || err}`;
      console.warn('[FixLens voice]', this.lastError);
      return false;
    }
  }

  /**
   * Speak technician guidance aloud: natural cloud voice first, browser voice as a fallback.
   * expireMs: if speech can't start within this time, skip it (for time-sensitive live tips).
   */
  public speak(
    text: string,
    options?: { rate?: number; pitch?: number; onEnd?: () => void; expireMs?: number }
  ): void {
    if (typeof window === 'undefined' || !this.enabled) return;
    const chunks = this.chunkText(text || '');
    if (chunks.length === 0) return;

    const mySession = ++this.session;
    this.queued = null; // a new utterance replaces anything that was waiting
    const deadline = options?.expireMs ? Date.now() + options.expireMs : 0;
    this.unlockAudio();
    this.haltPlayback();
    if (this.speakingNow) this.notifySpeakingState(false);
    this.pending = true;

    void (async () => {
      if (Date.now() >= this.cloudDownUntil) {
        const ok = await this.speakCloud(chunks, mySession, deadline, options);
        if (ok || mySession !== this.session) return;
      }
      if (mySession !== this.session) return;
      if (deadline && Date.now() > deadline) {
        this.pending = false;
        return;
      }
      this.speakBrowser(chunks, mySession, options);
    })();
  }

  /** Browser speechSynthesis fallback (quality depends on the voices installed on the OS). */
  private speakBrowser(
    chunks: string[],
    mySession: number,
    options?: { rate?: number; pitch?: number; onEnd?: () => void }
  ): void {
    if (!('speechSynthesis' in window)) {
      this.pending = false;
      return;
    }
    const synth = window.speechSynthesis;

    const start = async () => {
      await this.waitForVoices();
      if (mySession !== this.session) return; // superseded by newer speech or stop()
      if (synth.getVoices().length === 0) {
        this.lastError = this.lastError || 'no system voices installed';
      }

      const voice = this.voiceCache || this.loadBestVoice();
      this.activeUtterances = [];

      chunks.forEach((chunk, idx) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.rate = options?.rate ?? 1.0;
        u.pitch = options?.pitch ?? 1.0;
        u.lang = voice?.lang || 'en-US';
        if (voice) u.voice = voice;

        if (idx === 0) {
          u.onstart = () => {
            if (mySession === this.session) {
              this.pending = false;
              this.notifySpeakingState(true);
            }
          };
        }
        if (idx === chunks.length - 1) {
          u.onend = () => {
            if (mySession !== this.session) return;
            this.activeUtterances = [];
            this.notifySpeakingState(false);
            options?.onEnd?.();
            this.flushQueue();
          };
        }
        u.onerror = (e: SpeechSynthesisErrorEvent) => {
          // "interrupted"/"canceled" are normal when new speech replaces old speech.
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          console.warn('Speech error:', e.error);
          this.lastError = `browser voice error: ${e.error || 'unknown'}`;
          if (mySession === this.session) {
            this.pending = false;
            this.activeUtterances = [];
            this.notifySpeakingState(false);
          }
        };

        // Keep references so Chrome doesn't garbage-collect utterances mid-speech.
        this.activeUtterances.push(u);
        synth.speak(u);
      });

      // Some engines start paused after a cancel; make sure we're running.
      try {
        synth.resume();
      } catch {
        // ignore
      }

      // If the engine never starts (e.g. no voices on Linux), don't stay "busy" forever.
      setTimeout(() => {
        if (mySession === this.session && !this.speakingNow) {
          this.pending = false;
          this.flushQueue();
        }
      }, 3000);
    };

    // Chrome can silently drop speech that starts right after cancel(); wait a moment.
    setTimeout(start, 80);
  }

  // Stop any active speech
  public stop(): void {
    if (typeof window === 'undefined') return;
    this.session++;
    this.queued = null;
    this.haltPlayback();
    this.pending = false;
    this.activeUtterances = [];
    this.notifySpeakingState(false);
  }

  // Test sound: plays recognition chime + speaks test confirmation
  public testSound(): void {
    this.playSoundEffect('detect');
    setTimeout(() => {
      this.speak(
        'Sound feedback is active. FixLens is listening and ready to guide you through your computer repair.'
      );
    }, 280);
  }
}

// Global singleton instance
export const soundManager = new SoundFeedbackEngine();

// lib/sound-feedback.ts
// Bulletproof sound feedback engine: Web Audio API synthesized chimes + SpeechSynthesis voice guidance

class SoundFeedbackEngine {
  private audioCtx: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isUnlocked = false;
  private voiceCache: SpeechSynthesisVoice | null = null;
  private onSpeakingChangeCallbacks: Set<(isSpeaking: boolean) => void> = new Set();
  private watchdogTimer: any = null;
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
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadBestVoice();
        };
        this.loadBestVoice();
      }

      // Automatically unlock audio on first user touch/click anywhere on page
      const unlockHandler = () => {
        this.unlockAudio();
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

  // Speak technician guidance aloud with anti-GC protection and voice optimization
  public speak(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !this.enabled) return;
    if (!text || text.trim() === '') return;

    try {
      this.unlockAudio();

      // Cancel previous speech and resume engine
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }

      const cleanText = text
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove markdown code blocks
        .replace(/[*_~#]/g, '')            // remove markdown formatting
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options?.rate ?? 1.05;
      utterance.pitch = options?.pitch ?? 1.0;

      // Ensure voice is assigned
      const voice = this.voiceCache || this.loadBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // CRITICAL CHROME BUG FIX: Prevent Garbage Collection of utterance object mid-speech
      this.currentUtterance = utterance;
      (window as any).__fixlens_active_utterance = utterance;

      utterance.onstart = () => {
        this.notifySpeakingState(true);
      };

      const handleSpeechComplete = () => {
        this.notifySpeakingState(false);
        this.currentUtterance = null;
        (window as any).__fixlens_active_utterance = null;
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }
        if (options?.onEnd) {
          options.onEnd();
        }
      };

      utterance.onend = handleSpeechComplete;
      utterance.onerror = (e) => {
        console.warn('Speech error event:', e);
        handleSpeechComplete();
      };

      // Watchdog timer: If speech is longer than 25 seconds or gets stuck in Chrome, unpause
      const estimatedDurationMs = Math.max(4000, (cleanText.split(' ').length / 2.5) * 1000);
      this.watchdogTimer = setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, Math.min(10000, estimatedDurationMs / 2));

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech execution error:', err);
      this.notifySpeakingState(false);
    }
  }

  // Stop any active speech or audio
  public stop(): void {
    if (typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.notifySpeakingState(false);
      this.currentUtterance = null;
      (window as any).__fixlens_active_utterance = null;
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
    } catch (e) {
      console.warn('Sound stop error:', e);
    }
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

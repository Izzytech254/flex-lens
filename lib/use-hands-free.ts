'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { soundManager } from '@/lib/sound-feedback';

export type VoiceCommand = 'next' | 'back' | 'repeat' | 'stop' | 'fixed' | 'notworking';

const COMMANDS: Array<{ cmd: VoiceCommand; re: RegExp }> = [
  // Checked before "fixed" so "it's still not working" isn't read as "working".
  {
    cmd: 'notworking',
    re: /\b(didn'?t work|did not work|(still )?not working|still (broken|there|the same|happening)|try (something|another|a different)( one| way| fix)?|another (fix|way|solution)|different (fix|way|solution))\b/i,
  },
  { cmd: 'fixed', re: /\b(it'?s fixed|that fixed it|it works( now)?|working now|problem solved|all good now)\b/i },
  { cmd: 'back', re: /^(go )?(back|previous)( step)?\b/i },
  { cmd: 'repeat', re: /\b(repeat|say (that|it) again|come again|one more time)\b|^what\??$/i },
  { cmd: 'stop', re: /^(stop|quiet|be quiet|shut up|pause|mute)\b/i },
  { cmd: 'next', re: /^(next|continue|ok(ay)?,? (next|done)|done|i did it|did it|finished|got it)\b/i },
];

export function parseVoiceCommand(text: string): VoiceCommand | null {
  const t = text.trim().toLowerCase();
  for (const { cmd, re } of COMMANDS) if (re.test(t)) return cmd;
  return null;
}

/**
 * Continuous speech recognition for hands-free guidance.
 * Pauses while FixLens is speaking so it never hears its own voice.
 */
export function useHandsFree(options: {
  onCommand: (cmd: VoiceCommand, transcript: string) => void;
  onQuestion: (transcript: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const enabledRef = useRef(false);
  const speakingRef = useRef(false);
  const handlersRef = useRef(options);
  handlersRef.current = options;

  const safeStart = useCallback(() => {
    const rec = recRef.current;
    if (!rec || !enabledRef.current || speakingRef.current) return;
    try {
      rec.start();
    } catch {
      // Already started — ignore.
    }
  }, []);

  useEffect(() => {
    const SR = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return;
    setSupported(true);

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      // Browsers stop recognition periodically; restart if still enabled and we're not talking.
      if (enabledRef.current && !speakingRef.current) setTimeout(safeStart, 250);
    };
    rec.onerror = (ev: any) => {
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        enabledRef.current = false;
        setEnabled(false);
        setError('Microphone access was blocked. Allow it in your browser to use hands-free mode.');
      }
    };
    rec.onresult = (ev: any) => {
      if (speakingRef.current) return; // ignore anything captured while FixLens talks
      const result = ev.results[ev.results.length - 1];
      if (!result?.isFinal) return;
      const transcript = String(result[0]?.transcript || '').trim();
      if (!transcript) return;
      const cmd = parseVoiceCommand(transcript);
      if (cmd) handlersRef.current.onCommand(cmd, transcript);
      else if (transcript.split(/\s+/).length >= 2) handlersRef.current.onQuestion(transcript);
    };

    recRef.current = rec;

    const unsub = soundManager.subscribeSpeaking((speaking) => {
      speakingRef.current = speaking;
      if (speaking) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      } else if (enabledRef.current) {
        setTimeout(safeStart, 300);
      }
    });

    return () => {
      unsub();
      enabledRef.current = false;
      try {
        rec.abort();
      } catch {
        // ignore
      }
      recRef.current = null;
    };
  }, [safeStart]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    setError(null);
    if (next) {
      safeStart();
    } else {
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
    }
  }, [safeStart]);

  return { supported, enabled, listening, error, toggle };
}

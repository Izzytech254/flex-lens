'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';

interface AskFixLensModalProps {
  onClose: () => void;
  report: DiagnosisReport | null;
}

export default function AskFixLensModal({ onClose, report }: AskFixLensModalProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: "Hey, I'm here. What's going on with your computer?",
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const handleSendRef = useRef<(txt?: string) => void>(() => {});

  // Uses the shared sound manager so the global Voice & Sounds setting is respected.
  const speak = (txt: string) => {
    if (isMuted || !openRef.current) return;
    soundManager.speak(txt);
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = textToSend.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          report: report ? { ...report, capturedImage: undefined } : null,
          activeStepIndex: 0,
          // Earlier turns (excluding the greeting) so FixLens can go one step at a time.
          history: messages.slice(1).slice(-10),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.success && data.reply) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
        speak(data.reply);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: data.error || 'Sorry, I could not answer that. Please try again.' },
        ]);
      }
    } catch (e) {
      // Network-level failure (server down, restarting, or offline). Warn instead of error
      // so the Next.js dev overlay doesn't treat a handled case as a crash.
      console.warn('Ask FixLens request failed:', e);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: offline
            ? "Looks like you're offline. Check your internet connection and try again."
            : "I can't reach the FixLens server right now. Give it a moment and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  // Closing the chat stops any reply that's still being spoken (or still loading).
  const openRef = useRef(true);
  useEffect(() => {
    openRef.current = true;
    return () => {
      openRef.current = false;
      soundManager.stop();
      recognitionRef.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (ev: any) => {
          const txt = ev.results[0][0].transcript;
          setInputText(txt);
          setIsListening(false);
          handleSendRef.current?.(txt);
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask FixLens"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 flex flex-col h-[560px] max-h-[90vh] overflow-hidden animate-slideUp"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ink text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold tracking-tight text-base leading-none text-ink">Ask FixLens</h2>
              <p className="text-xs text-slate-500">
                {report ? `About: ${report.problemSummary}` : 'Describe the problem or ask a question'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (!isMuted) soundManager.stop();
                setIsMuted(!isMuted);
              }}
              aria-label={isMuted ? 'Unmute replies' : 'Mute replies'}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-accent-600" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50/60" aria-live="polite">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-ink text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-500 px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-600" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            aria-label={isListening ? 'Stop listening' : 'Speak your question'}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              isListening ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={1000}
            aria-label="Your question"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Listening...' : 'Type a computer question...'}
            autoFocus
            className="flex-1 h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-400/30 transition"
          />

          <button
            type="button"
            disabled={!inputText.trim() || isLoading}
            onClick={() => handleSend()}
            aria-label="Send"
            className="w-10 h-10 rounded-lg bg-ink hover:bg-ink-2 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

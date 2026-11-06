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

interface AskFixLensModalProps {
  onClose: () => void;
  report: DiagnosisReport | null;
}

export default function AskFixLensModal({ onClose, report }: AskFixLensModalProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Ask any question about your computer problem.',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const handleSendRef = useRef<(txt?: string) => void>(() => {});

  const speak = (txt: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(txt);
    utt.rate = 1.05;
    window.speechSynthesis.speak(utt);
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
          report,
          activeStepIndex: 0,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
        speak(data.reply);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'I am here to help. What error or symptom are you seeing?' },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Could not connect to voice service. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[520px] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Ask FixLens</h4>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Technician Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (!isMuted) window.speechSynthesis?.cancel();
                setIsMuted(!isMuted);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 ${
              isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-blue-600 border border-slate-200'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Listening...' : 'Type a computer question...'}
            className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
          />

          <button
            type="button"
            disabled={!inputText.trim() || isLoading}
            onClick={() => handleSend()}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 transition shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

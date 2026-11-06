'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Sparkles, MessageSquare } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';

interface VoiceAssistantBarProps {
  report: DiagnosisReport | null;
  activeStepIndex: number;
}

export default function VoiceAssistantBar({ report, activeStepIndex }: VoiceAssistantBarProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [responseAudioText, setResponseAudioText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [recognitionSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Speak aloud
  const speakResponse = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type questions below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript.trim()) {
        handleAskVoice(transcript);
      }
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Recognition start failed:', err);
      }
    }
  };

  // Send query to voice API
  const handleAskVoice = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;
    setIsLoading(true);
    setResponseAudioText(null);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText,
          report,
          activeStepIndex,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setResponseAudioText(data.reply);
        speakResponse(data.reply);
      }
    } catch (e) {
      console.error('Voice assistant error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Common quick voice question chips
  const quickPrompts = [
    'Explain in simpler terms',
    'Why did this error happen?',
    'What should I do next?',
    'I followed instructions but it failed',
  ];

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-slate-200">FixLens Voice Assistant</span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isMuted) window.speechSynthesis?.cancel();
            setIsMuted(!isMuted);
          }}
          className={`p-1.5 rounded-lg border text-xs transition ${
            isMuted
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
          title={isMuted ? 'Unmute technician speech' : 'Mute technician speech'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
        </button>
      </div>

      {/* Spoken Response Box */}
      {responseAudioText && (
        <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs text-cyan-100 flex items-start gap-2 animate-fadeIn">
          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{responseAudioText}</div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition shadow-sm ${
            isListening
              ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice conversation'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-400" />}
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAskVoice(transcript);
              }
            }}
            placeholder={
              isListening
                ? 'Listening to your voice...'
                : 'Ask FixLens voice or type question...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />

          <button
            type="button"
            disabled={!transcript.trim() || isLoading}
            onClick={() => handleAskVoice(transcript)}
            className="absolute right-1.5 p-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setTranscript(prompt);
              handleAskVoice(prompt);
            }}
            className="whitespace-nowrap px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-[10px] font-medium text-slate-400 hover:text-slate-200 rounded-md border border-slate-800 transition"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

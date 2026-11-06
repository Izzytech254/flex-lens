'use client';

import React, { useEffect } from 'react';
import {
  ChevronLeft,
  Check,
  MessageSquare,
  FileText,
  Bookmark,
} from 'lucide-react';
import { soundManager } from '@/lib/sound-feedback';

interface VerificationScreenProps {
  onBack: () => void;
  onDone: () => void;
  onAskQuestion: () => void;
  onViewDetails: () => void;
  onSaveToHistory: () => void;
  subtitle?: string;
}

export default function VerificationScreen({
  onBack,
  onDone,
  onAskQuestion,
  onViewDetails,
  onSaveToHistory,
  subtitle,
}: VerificationScreenProps) {
  useEffect(() => {
    soundManager.playSoundEffect('success');
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      {/* Top Header matching Showcase Screen 7 */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-base font-extrabold text-slate-900">
          Verification
        </h2>

        <div className="w-9" />
      </div>

      {/* Main Card matching Showcase Screen 7 */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-6 text-center">
        {/* Big Green Circle Checkmark */}
        <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
          <Check className="w-10 h-10 stroke-[3.5]" />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Problem Solved!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
            {subtitle || 'Your computer is now connected to the internet.'}
          </p>
        </div>

        {/* "What would you like to do?" Box matching Showcase Screen 7 */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100/80 text-left space-y-3">
          <span className="text-xs font-bold text-slate-900 block">
            What would you like to do?
          </span>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onAskQuestion}
              className="w-full p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200/70 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-800 transition shadow-xs group"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="group-hover:text-blue-600 transition">Ask a Question</span>
            </button>

            <button
              type="button"
              onClick={onViewDetails}
              className="w-full p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200/70 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-800 transition shadow-xs group"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span className="group-hover:text-blue-600 transition">View Details</span>
            </button>

            <button
              type="button"
              onClick={onSaveToHistory}
              className="w-full p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200/70 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-800 transition shadow-xs group"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <span className="group-hover:text-blue-600 transition">Save to History</span>
            </button>
          </div>
        </div>

        {/* Done Button matching Showcase Screen 7 */}
        <button
          type="button"
          onClick={onDone}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full text-sm font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
        >
          <span>Done ✓</span>
        </button>
      </div>
    </div>
  );
}

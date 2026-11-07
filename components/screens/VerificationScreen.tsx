'use client';

import React, { useState } from 'react';
import { ChevronLeft, Check, X, MessageSquare, FileText, HelpCircle } from 'lucide-react';
import { soundManager } from '@/lib/sound-feedback';

interface VerificationScreenProps {
  problemSummary?: string;
  onBack: () => void;
  onConfirmFixed: () => void;
  onNotFixed: () => void;
  onAskQuestion: () => void;
  onViewDetails: () => void;
}

// FixLens cannot see your PC after the steps, so the user confirms the result honestly.
export default function VerificationScreen({
  problemSummary,
  onBack,
  onConfirmFixed,
  onNotFixed,
  onAskQuestion,
  onViewDetails,
}: VerificationScreenProps) {
  const [answer, setAnswer] = useState<'fixed' | null>(null);

  const confirmFixed = () => {
    soundManager.playSoundEffect('success');
    setAnswer('fixed');
    setTimeout(onConfirmFixed, 900);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          aria-label="Back to fix guide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-extrabold text-slate-900">Verification</h2>
        <div className="w-9" />
      </div>

      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-6 text-center">
        {answer === 'fixed' ? (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
              <Check className="w-10 h-10 stroke-[3.5]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Problem solved!</h1>
            <p className="text-sm text-slate-600">Saved to your history.</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25">
              <HelpCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Did this fix the problem?
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
                {problemSummary
                  ? `Check whether “${problemSummary}” still appears on your computer.`
                  : 'Check whether the error still appears on your computer.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={confirmFixed}
                className="py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Check className="w-4 h-4" />
                Yes, it&apos;s fixed
              </button>
              <button
                type="button"
                onClick={onNotFixed}
                className="py-4 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-98"
              >
                <X className="w-4 h-4" />
                No, rescan
              </button>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100/80 text-left space-y-1.5">
              <button
                type="button"
                onClick={onAskQuestion}
                className="w-full p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200/70 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-800 transition shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Ask FixLens a question
              </button>
              <button
                type="button"
                onClick={onViewDetails}
                className="w-full p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200/70 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-800 transition shadow-xs"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                View diagnosis details
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

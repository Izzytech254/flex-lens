'use client';

import React from 'react';
import { Camera, Brain, Check, ArrowRight } from 'lucide-react';

interface OnboardingScreenProps {
  onGetStarted: () => void;
}

export default function OnboardingScreen({ onGetStarted }: OnboardingScreenProps) {
  return (
    <div className="w-full flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-blue-50/50 via-white to-white select-none animate-fadeIn">
      {/* Top Header */}
      <div className="w-full flex justify-end">
        <button
          type="button"
          onClick={onGetStarted}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Skip
        </button>
      </div>

      {/* Main Copy & Illustration */}
      <div className="flex flex-col items-center text-center my-auto">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Your AI<br />Computer Technician
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-[240px] leading-relaxed">
          Point your phone at a computer problem and get instant help.
        </p>

        {/* Visual Phone Scanning Laptop Illustration */}
        <div className="relative mt-6 mb-6 w-64 h-44 flex items-center justify-center">
          {/* Laptop Base */}
          <div className="w-48 h-32 bg-slate-900 rounded-t-lg border border-slate-700 p-1.5 shadow-xl relative">
            <div className="w-full h-full bg-slate-950 rounded flex flex-col items-center justify-center p-2 relative overflow-hidden">
              {/* Red error dialog on laptop */}
              <div className="w-24 h-14 bg-slate-800 rounded border border-rose-500/80 flex flex-col items-center justify-center p-1 shadow-lg">
                <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold mb-1">
                  !
                </div>
                <div className="w-12 h-1 bg-slate-600 rounded" />
              </div>
            </div>
            {/* Keyboard deck */}
            <div className="absolute -bottom-2 -left-2 -right-2 h-2.5 bg-slate-400 rounded-b-lg border-t border-slate-500" />
          </div>

          {/* Smartphone Overlay held in foreground */}
          <div className="absolute right-3 -bottom-1 w-24 h-40 bg-slate-950 rounded-2xl border-2 border-slate-700 shadow-2xl p-1 z-10 transform rotate-[-6deg] flex flex-col">
            <div className="w-8 h-1 bg-slate-800 rounded-full mx-auto mb-1" />
            <div className="w-full flex-1 bg-blue-900/60 rounded-xl border border-cyan-400/80 p-1 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Reticle */}
              <div className="w-12 h-12 border border-cyan-400 rounded flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-cyan-400/40 animate-ping" />
              </div>
              <span className="text-[7px] text-cyan-200 mt-1 font-mono">SCANNING</span>
            </div>
          </div>
        </div>

        {/* 3-Step Process Indicator Row */}
        <div className="w-full flex items-center justify-between px-2 py-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700">Scan the screen</span>
          </div>

          <span className="text-slate-300 text-xs font-bold">→</span>

          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700">Get AI diagnosis</span>
          </div>

          <span className="text-slate-300 text-xs font-bold">→</span>

          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700">Follow easy steps</span>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5 mt-4">
          <span className="w-2 h-2 rounded-full bg-slate-200" />
          <span className="w-5 h-2 rounded-full bg-blue-600" />
          <span className="w-2 h-2 rounded-full bg-slate-200" />
        </div>
      </div>

      {/* Primary Bottom Button */}
      <button
        type="button"
        onClick={onGetStarted}
        className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition"
      >
        <span>Get Started</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

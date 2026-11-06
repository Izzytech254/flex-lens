'use client';

import React, { useEffect } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface SplashScreenProps {
  onNext: () => void;
}

export default function SplashScreen({ onNext }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <div
      onClick={onNext}
      className="w-full flex-1 flex flex-col items-center justify-between p-6 cursor-pointer bg-gradient-to-b from-blue-50/60 via-white to-blue-50/40 select-none animate-fadeIn"
    >
      <div className="w-full flex justify-end">
        <span className="text-xs text-blue-600 font-semibold hover:underline">Skip</span>
      </div>

      {/* Main Logo & Headline */}
      <div className="flex flex-col items-center text-center my-auto">
        {/* Camera Lens Icon with Reticle Brackets */}
        <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-3xl animate-spin duration-10000" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-blue-500/30">
            <div className="w-12 h-12 rounded-full border-4 border-white/90 bg-slate-900 flex items-center justify-center shadow-inner">
              <div className="w-5 h-5 rounded-full bg-cyan-400/80 shadow-[0_0_10px_#38bdf8]" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          FixLens
        </h1>
        <p className="text-base font-bold text-slate-800 mt-1">
          See it. Understand it. Fix it.
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
          The AI Computer Technician in Your Pocket
        </p>

        {/* Laptop Illustration with Windows Bloom */}
        <div className="relative mt-8 w-60 h-36 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-xl p-1.5 shadow-2xl border-t border-x border-slate-700">
          <div className="w-full h-full bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-700 rounded-t-lg overflow-hidden flex items-center justify-center relative">
            {/* Windows 11 Bloom petals */}
            <div className="w-24 h-24 rounded-full bg-sky-300/40 blur-md absolute animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-blue-300/60 blur-sm absolute" />
            <div className="absolute bottom-1 w-full flex justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            </div>
          </div>
          {/* Laptop Base */}
          <div className="absolute -bottom-2 -left-3 -right-3 h-2.5 bg-slate-300 rounded-b-xl border-t border-slate-400/60 shadow-md" />
        </div>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mb-4">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Getting ready...</span>
      </div>
    </div>
  );
}

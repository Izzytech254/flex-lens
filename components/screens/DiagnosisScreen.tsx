'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  RotateCcw,
  ArrowRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';

interface DiagnosisScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  onNext: () => void;
}

export default function DiagnosisScreen({ report, onBack, onNext }: DiagnosisScreenProps) {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const title = report?.problemSummary || 'Network Connection Problem';
  const bullets =
    report?.observedSymptoms && report.observedSymptoms.length > 0
      ? report.observedSymptoms
      : [
          'A Wi-Fi connection issue',
          'A network settings problem',
          'A temporary glitch',
        ];

  const recommendedAction =
    report?.troubleshootingSteps?.[0]?.description ||
    report?.troubleshootingSteps?.[0]?.title ||
    "Let's check your Wi-Fi settings first.";

  useEffect(() => {
    const unsub = soundManager.subscribeSpeaking(setIsSpeaking);
    return () => {
      unsub();
      soundManager.stop();
    };
  }, []);

  const speakDiagnosis = () => {
    if (isSpeaking) {
      soundManager.stop();
      return;
    }
    soundManager.playSoundEffect('alert');
    soundManager.speak(
      `${title}. Your computer cannot connect properly. Recommended action: ${recommendedAction}`
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      {/* Top Header matching Showcase Screen 5 */}
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
          Diagnosis
        </h2>

        <button
          type="button"
          onClick={speakDiagnosis}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition border shadow-xs ${
            isSpeaking
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-blue-600 border-slate-200/90 hover:bg-slate-50'
          }`}
          title="Voice narration"
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Card matching Showcase Screen 5 */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-6">
        {/* Big Red Circle Exclamation Icon */}
        <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-500/25">
          <span className="text-4xl font-black font-sans">!</span>
        </div>

        {/* Title & Subtext */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
            Your computer can&apos;t connect to the internet. This may be caused by:
          </p>
        </div>

        {/* Clean Bullet List matching Showcase */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100/80">
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confidence Bar matching Showcase */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-blue-600">Confidence</span>
            <span className="text-slate-900 font-mono">95%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="w-[95%] h-full bg-blue-600 rounded-full" />
          </div>
        </div>

        {/* Recommended Action Card matching Showcase Screen 5 */}
        <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Recommended Action
            </span>
            <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">
              {recommendedAction}
            </p>
          </div>
        </div>

        {/* Next Button matching Showcase */}
        <button
          type="button"
          onClick={onNext}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full text-sm font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
        >
          <span>Next: See Instructions</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

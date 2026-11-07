'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, RotateCcw, ArrowRight, Volume2, VolumeX, ExternalLink, Camera } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';

interface DiagnosisScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  onNext: () => void;
  onStartScan: () => void;
}

const PROBABILITY_STYLES: Record<string, string> = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
};

const CONFIDENCE_FALLBACK: Record<string, number> = { HIGH: 0.85, MEDIUM: 0.6, LOW: 0.35 };

export default function DiagnosisScreen({ report, onBack, onNext, onStartScan }: DiagnosisScreenProps) {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    const unsub = soundManager.subscribeSpeaking(setIsSpeaking);
    return () => {
      unsub();
      soundManager.stop();
    };
  }, []);

  if (!report) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-slate-900">No diagnosis yet</h1>
        <p className="text-sm text-slate-600">Scan an error on your screen or upload a screenshot to get a diagnosis.</p>
        <button
          type="button"
          onClick={onStartScan}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-md"
        >
          Start Scanning
        </button>
      </div>
    );
  }

  const title = report.problemSummary;
  const steps = report.troubleshootingSteps || [];
  const codes = report.detectedErrorCodes || [];
  const citations = report.citations || [];
  const firstStep = steps[0];
  const recommendedAction = firstStep?.description || firstStep?.title || '';
  const confidencePct = Math.round(
    (report.confidenceScore ?? CONFIDENCE_FALLBACK[report.confidence] ?? 0.5) * 100
  );
  const causes = report.possibleCauses || [];
  const symptoms = report.observedSymptoms || [];

  const speakDiagnosis = () => {
    if (isSpeaking) {
      soundManager.stop();
      return;
    }
    soundManager.playSoundEffect('alert');
    const causeText = causes.length > 0 ? ` The most likely cause is ${causes[0].title}.` : '';
    soundManager.speak(
      `${title}.${causeText}${recommendedAction ? ` Recommended action: ${recommendedAction}` : ''}`
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          aria-label="Back to scanner"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-base font-extrabold text-slate-900">Diagnosis</h2>

        <button
          type="button"
          onClick={speakDiagnosis}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition border shadow-xs ${
            isSpeaking
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-blue-600 border-slate-200/90 hover:bg-slate-50'
          }`}
          aria-label={isSpeaking ? 'Stop narration' : 'Read diagnosis aloud'}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-500/25">
          <span className="text-4xl font-black font-sans">!</span>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {codes.map((c) => (
              <span key={c} className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {c}
              </span>
            ))}
            {report.affectedComponent && (
              <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {report.affectedComponent}
              </span>
            )}
          </div>
        </div>

        {symptoms.length > 0 && (
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100/80 space-y-2">
            <span className="text-xs font-bold text-slate-900 block">What FixLens sees</span>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
              {symptoms.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {causes.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 block">Possible causes</span>
            <ul className="space-y-2">
              {causes.map((c, idx) => (
                <li key={idx} className="p-3 rounded-2xl border border-slate-100 bg-white flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 block">{c.title}</span>
                    {c.whyLikely && <span className="text-[11px] text-slate-500">{c.whyLikely}</span>}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      PROBABILITY_STYLES[c.probability] || PROBABILITY_STYLES.LOW
                    }`}
                  >
                    {c.probability}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-blue-600">Confidence</span>
            <span className="text-slate-900 font-mono">{confidencePct}%</span>
          </div>
          <div
            className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={confidencePct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>

        {recommendedAction && (
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Recommended first step</span>
              <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">{recommendedAction}</p>
            </div>
          </div>
        )}

        {citations.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-900 block">Sources</span>
            {citations.map((c) => (
              <a
                key={c.url}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="line-clamp-1">{c.sourceTitle}</span>
              </a>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={steps.length === 0}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full text-sm font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>
            {steps.length > 0 ? 'Next: See Instructions' : 'No fix steps available — try rescanning'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

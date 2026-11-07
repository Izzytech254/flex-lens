'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  Terminal,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Camera,
  MousePointerClick,
} from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';

interface FixGuideScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  onComplete: () => void;
  onStartScan: () => void;
}

export default function FixGuideScreen({ report, onBack, onComplete, onStartScan }: FixGuideScreenProps) {
  const steps = report?.troubleshootingSteps || [];

  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const unsub = soundManager.subscribeSpeaking(setIsSpeaking);
    return () => {
      unsub();
      soundManager.stop();
    };
  }, []);

  if (!report || steps.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Camera className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-slate-900">No fix steps yet</h1>
        <p className="text-sm text-slate-600">Scan an error first and FixLens will build a step-by-step guide for it.</p>
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

  const currentStep = steps[Math.min(activeStepIdx, steps.length - 1)];
  const isCommand = !!currentStep.command;

  const speakCurrentStep = () => {
    if (isSpeaking) {
      soundManager.stop();
      return;
    }
    soundManager.playSoundEffect('step');
    soundManager.speak(
      `Step ${activeStepIdx + 1} of ${steps.length}: ${currentStep.title}. ${currentStep.description}${
        currentStep.safetyCaution ? ` Caution: ${currentStep.safetyCaution}` : ''
      }`
    );
  };

  const handleNext = () => {
    soundManager.playSoundEffect('step');
    setCopied(false);
    if (activeStepIdx < steps.length - 1) {
      setActiveStepIdx(activeStepIdx + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    setCopied(false);
    if (activeStepIdx > 0) setActiveStepIdx(activeStepIdx - 1);
    else onBack();
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <button
          type="button"
          onClick={handlePrev}
          className="w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          aria-label={activeStepIdx > 0 ? 'Previous step' : 'Back to diagnosis'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-base font-extrabold text-slate-900">Fix Guide</h2>

        <button
          type="button"
          onClick={speakCurrentStep}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition border shadow-xs ${
            isSpeaking
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-blue-600 border-slate-200/90 hover:bg-slate-50'
          }`}
          aria-label={isSpeaking ? 'Stop narration' : 'Read step aloud'}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              {activeStepIdx + 1}
            </div>
            <span className="text-xs font-bold text-slate-400">
              Step {activeStepIdx + 1} of {steps.length}
            </span>
            {currentStep.isAdministratorRequired && (
              <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Admin required
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex gap-1" aria-hidden="true">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 flex-1 rounded-full ${idx <= activeStepIdx ? 'bg-blue-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight pt-2">{currentStep.title}</h1>

          {currentStep.description && (
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{currentStep.description}</p>
          )}
        </div>

        {isCommand ? (
          <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-cyan-400 flex items-center gap-1 font-sans font-bold">
                <Terminal className="w-3.5 h-3.5" />
                {currentStep.actionType === 'cmd_command'
                  ? 'Command Prompt'
                  : currentStep.actionType === 'terminal_cmd'
                  ? 'Terminal'
                  : 'PowerShell'}
                {currentStep.isAdministratorRequired
                  ? currentStep.actionType === 'terminal_cmd'
                    ? ' (needs sudo / admin)'
                    : ' (Run as administrator)'
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(currentStep.command || '')}
                className="text-slate-300 hover:text-white flex items-center gap-1 font-sans font-semibold transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-cyan-300 break-all select-text">{currentStep.command}</div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-3 text-xs text-slate-700">
            <MousePointerClick className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-medium leading-relaxed">
              Do this on your computer, then come back and tap <strong>Next Step</strong>.
            </span>
          </div>
        )}

        {currentStep.safetyCaution && (
          <div role="note" className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{currentStep.safetyCaution}</span>
          </div>
        )}

        {currentStep.expectedOutcome && (
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-start gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              <strong>You should see:</strong> {currentStep.expectedOutcome}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playSoundEffect('click');
              speakCurrentStep();
            }}
            className="flex-1 py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-98 shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>Repeat</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <span>{activeStepIdx < steps.length - 1 ? 'Next Step' : 'Done'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

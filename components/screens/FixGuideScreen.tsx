'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  Settings,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { DiagnosisReport, TroubleshootingStep } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';

interface FixGuideScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  onComplete: () => void;
}

export default function FixGuideScreen({
  report,
  onBack,
  onComplete,
}: FixGuideScreenProps) {
  const steps: TroubleshootingStep[] = report?.troubleshootingSteps || [
    {
      stepNumber: 1,
      title: 'Open Windows Settings',
      description: 'Click the Start menu and select Settings.',
      simpleExplanation: 'Click Start and open Settings.',
      actionType: 'gui_action',
      expectedOutcome: 'Settings opens',
      verificationCriteria: 'Settings gear visible',
      status: 'pending',
    },
    {
      stepNumber: 2,
      title: 'Restart WLAN Service',
      description: 'Restart the Windows Wi-Fi network background service.',
      simpleExplanation: 'Reset Wi-Fi service.',
      actionType: 'powershell_cmd',
      command: 'Restart-Service -Name WlanSvc -Force; ipconfig /flushdns',
      expectedOutcome: 'WLAN service running',
      verificationCriteria: 'Wi-Fi reconnects',
      status: 'pending',
    },
    {
      stepNumber: 3,
      title: 'Verify Internet Connection',
      description: 'Check whether web pages load properly.',
      simpleExplanation: 'Check connection.',
      actionType: 'gui_action',
      expectedOutcome: 'Connected',
      verificationCriteria: 'Connection restored',
      status: 'pending',
    },
  ];

  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const currentStep = steps[activeStepIdx] || steps[0];

  useEffect(() => {
    const unsub = soundManager.subscribeSpeaking(setIsSpeaking);
    return () => {
      unsub();
      soundManager.stop();
    };
  }, []);

  const speakCurrentStep = () => {
    if (isSpeaking) {
      soundManager.stop();
      return;
    }
    soundManager.playSoundEffect('step');
    soundManager.speak(
      `Step ${activeStepIdx + 1} of ${steps.length}: ${currentStep.title}. ${currentStep.description}`
    );
  };

  const handleNext = () => {
    soundManager.playSoundEffect('step');
    if (activeStepIdx < steps.length - 1) {
      setActiveStepIdx(activeStepIdx + 1);
    } else {
      soundManager.playSoundEffect('success');
      onComplete();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      {/* Top Header matching Showcase Screen 6 */}
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
          Fix Guide
        </h2>

        <button
          type="button"
          onClick={speakCurrentStep}
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

      {/* Main Card matching Showcase Screen 6 */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-6">
        {/* Step indicator header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              {activeStepIdx + 1}
            </div>
            <span className="text-xs font-bold text-slate-400">
              Step {activeStepIdx + 1} of {steps.length}
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {currentStep.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Optional PowerShell Command box with 1-click copy */}
        {currentStep.command && (
          <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-cyan-400 flex items-center gap-1 font-sans font-bold">
                <Terminal className="w-3.5 h-3.5" />
                PowerShell Command
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
            <div className="text-cyan-300 break-all select-text">
              {currentStep.command}
            </div>
          </div>
        )}

        {/* Visual Interface Simulation matching Showcase Screen 6 */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl bg-gradient-to-b from-[#1a2332] to-[#0f1724] border border-slate-800 overflow-hidden shadow-inner p-4 flex flex-col justify-between">
          {/* Windows Start Menu / Dialog Container */}
          <div className="w-64 bg-[#1e293b]/95 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3 shadow-2xl space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Windows Apps
            </span>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-slate-300">
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded bg-blue-500/30 text-blue-400 flex items-center justify-center font-bold">W</div>
                <span>Edge</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded bg-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">T</div>
                <span>Terminal</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded bg-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">F</div>
                <span>Files</span>
              </div>
            </div>

            {/* Highlighted Settings icon with Callout Bubble */}
            <div className="relative pt-2">
              <div className="p-2 rounded-xl bg-blue-500/20 border-2 border-blue-400 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400 animate-spin duration-3000" />
                <span className="text-xs font-bold text-white">Settings</span>
              </div>

              {/* Blue Speech Callout Bubble matching Showcase Screen 6 */}
              <div className="absolute -top-10 left-12 bg-blue-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-2xl border border-blue-400 flex items-center gap-1 animate-bounce whitespace-nowrap">
                <span>Click Settings</span>
                <span className="absolute -bottom-1.5 left-6 w-3 h-3 bg-blue-600 rotate-45 border-r border-b border-blue-400" />
              </div>
            </div>
          </div>

          {/* Windows Taskbar */}
          <div className="w-full h-7 bg-[#0b111e] rounded-lg border border-slate-800 px-2 flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-blue-500" />
            <div className="w-3 h-3 rounded bg-slate-700" />
            <div className="w-3 h-3 rounded bg-slate-700" />
          </div>
        </div>

        {/* Bottom Button Row matching Showcase Screen 6: [Repeat] and [Next Step →] */}
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

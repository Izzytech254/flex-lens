'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Camera,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { DiagnosisReport, TroubleshootingStep, ReassessmentResult } from '@/types/technician';

interface TroubleshootingStepperProps {
  report: DiagnosisReport;
  activeStepIndex: number;
  setActiveStepIndex: (idx: number) => void;
  onStepComplete: (stepIndex: number) => void;
  onStepFail: (stepIndex: number, failureNotes: string) => void;
  onVerifyWithCamera: (step: TroubleshootingStep) => void;
  onBackToDiagnosis: () => void;
  isReassessing: boolean;
  reassessment: ReassessmentResult | null;
}

export default function TroubleshootingStepper({
  report,
  activeStepIndex,
  setActiveStepIndex,
  onStepComplete,
  onStepFail,
  onVerifyWithCamera,
  onBackToDiagnosis,
  isReassessing,
  reassessment,
}: TroubleshootingStepperProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showFailureModal, setShowFailureModal] = useState<boolean>(false);
  const [failureReason, setFailureReason] = useState<string>('');

  const steps = report.troubleshootingSteps;
  const currentStep = steps[activeStepIndex] || steps[0];

  // Copy command to clipboard
  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text to Speech playback for current step
  const handleSpeakStep = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const speechText = `Step ${currentStep.stepNumber}: ${currentStep.title}. ${currentStep.simpleExplanation}. Expected outcome: ${currentStep.expectedOutcome}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleConfirmFailure = () => {
    onStepFail(activeStepIndex, failureReason);
    setShowFailureModal(false);
    setFailureReason('');
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBackToDiagnosis}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Diagnosis</span>
        </button>

        <div className="text-xs font-mono font-bold text-cyan-400">
          STEP {activeStepIndex + 1} OF {steps.length}
        </div>
      </div>

      {/* Adaptive Reassessment Alert Banner if applicable */}
      {reassessment && (
        <div className="p-3 bg-indigo-950/70 border border-indigo-700/60 rounded-xl flex flex-col gap-1.5 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Adaptive Diagnosis Applied</span>
          </div>
          <p className="text-[11px] text-slate-200">{reassessment.analysisOfFailure}</p>
          {reassessment.newHypothesis && (
            <div className="text-[10px] text-cyan-300 bg-indigo-900/50 p-1.5 rounded">
              <span className="font-semibold">New Hypothesis:</span> {reassessment.newHypothesis}
            </div>
          )}
        </div>
      )}

      {/* Step Progress Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {steps.map((st, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveStepIndex(idx)}
            className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold transition border ${
              activeStepIndex === idx
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-900/50 scale-105'
                : st.status === 'completed'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : st.status === 'failed'
                ? 'bg-rose-950 text-rose-400 border-rose-800'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {st.status === 'completed' ? (
              <Check className="w-3.5 h-3.5" />
            ) : st.status === 'failed' ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              idx + 1
            )}
          </button>
        ))}
      </div>

      {/* Active Step Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        {/* Step Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase">
              Action #{currentStep.stepNumber} • {currentStep.actionType.replace(/_/g, ' ')}
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">{currentStep.title}</h3>
          </div>

          <button
            type="button"
            onClick={handleSpeakStep}
            className={`p-2 rounded-xl border transition ${
              isSpeaking
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Read step aloud"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Plain-English Explanation */}
        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Technician Simple Explanation
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {currentStep.simpleExplanation || currentStep.description}
          </p>
        </div>

        {/* Detailed Technical Instruction */}
        {currentStep.description !== currentStep.simpleExplanation && (
          <div className="text-xs text-slate-300 leading-relaxed">
            {currentStep.description}
          </div>
        )}

        {/* Command Box if applicable */}
        {currentStep.command && (
          <div className="bg-black/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-300">
                <Terminal className="w-3 h-3 text-cyan-400" />
                {currentStep.isAdministratorRequired ? 'Administrator: PowerShell / CMD' : 'Command Prompt'}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCommand(currentStep.command || '')}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3 font-mono text-xs text-emerald-400 select-all overflow-x-auto whitespace-pre-wrap break-all">
              {currentStep.command}
            </div>
          </div>
        )}

        {/* Expected Outcome & Verification Criteria */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-left">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Expected Outcome
            </div>
            <div className="text-xs text-slate-200 mt-0.5">{currentStep.expectedOutcome}</div>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-left">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              Verification Criteria (How to know it worked)
            </div>
            <div className="text-xs text-cyan-100 mt-0.5">{currentStep.verificationCriteria}</div>
          </div>
        </div>

        {/* Safety Caution if present */}
        {currentStep.safetyCaution && (
          <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200">{currentStep.safetyCaution}</div>
          </div>
        )}

        {/* Step Outcome Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepComplete(activeStepIndex)}
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Step Worked / Completed</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFailureModal(true)}
              className="py-2.5 px-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 active:scale-95 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Failed / Errored</span>
            </button>
          </div>

          {/* Camera Verification Button */}
          <button
            type="button"
            onClick={() => onVerifyWithCamera(currentStep)}
            className="w-full py-2.5 px-3 bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-800/80 text-cyan-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Verify Screen State with Camera</span>
          </button>
        </div>
      </div>

      {/* Failure Feedback Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
              <ShieldAlert className="w-5 h-5" />
              <span>Troubleshooting Step Failed</span>
            </div>
            <p className="text-xs text-slate-300">
              Tell FixLens what happened on the computer (error message, nothing happened, access denied). FixLens will adaptively recalculate the procedure:
            </p>

            <textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="e.g. Returned 'System error 5 has occurred. Access is denied' or 'The service could not be started'..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 resize-none"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFailureModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReassessing}
                onClick={handleConfirmFailure}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {isReassessing ? 'Adapting...' : 'Reassess with AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

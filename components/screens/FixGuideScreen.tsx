'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, ArrowRight, ArrowLeft, Terminal, Copy, Check, ShieldAlert, Camera, MousePointerClick } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';
import { Badge, Button, Card, EmptyState, IconButton, Notice, Page, PageHeader, cx } from '@/components/ui';

interface FixGuideScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  onComplete: () => void;
  onStartScan: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

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
      <Page size="sm">
        <Card>
          <EmptyState
            icon={<Camera className="w-6 h-6" />}
            title="No fix steps yet"
            description="Scan an error first and FixLens will build a step-by-step guide for it."
            action={<Button onClick={onStartScan}>Start scanning</Button>}
          />
        </Card>
      </Page>
    );
  }

  const idx = Math.min(activeStepIdx, steps.length - 1);
  const currentStep = steps[idx];
  const isLast = idx === steps.length - 1;
  const commandLabel =
    currentStep.actionType === 'cmd_command' ? 'Command Prompt' : currentStep.actionType === 'terminal_cmd' ? 'Terminal' : 'PowerShell';

  const speakCurrentStep = () => {
    if (isSpeaking) {
      soundManager.stop();
      return;
    }
    const lead = idx === 0 ? 'Ok so, first thing.' : isLast ? 'Alright, last thing.' : 'Alright, next thing.';
    const body =
      currentStep.spokenInstruction ||
      (currentStep.description || currentStep.title).replace(/\s*[,;]?\s*(?:and then|then)\s+/gi, '. ... ');
    const beats = [lead, body];
    if (currentStep.command) beats.push("I've put the command on your screen. ... Just copy it in.");
    if (currentStep.safetyCaution) beats.push(`One thing to watch out for. ... ${currentStep.safetyCaution}`);
    beats.push("Tell me when you've done that.");
    soundManager.speak(beats.join(' ... '));
  };

  const goTo = (next: number) => {
    setCopied(false);
    soundManager.stop();
    setActiveStepIdx(next);
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
    <Page size="lg">
      <PageHeader
        eyebrow="03 / The fix"
        title={report.problemSummary}
        onBack={onBack}
        backLabel="Diagnosis"
        actions={
          <IconButton label={isSpeaking ? 'Stop reading' : 'Read step aloud'} variant={isSpeaking ? 'active' : 'secondary'} onClick={speakCurrentStep}>
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </IconButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        {/* Step rail — like an altitude indicator for your progress */}
        <nav aria-label="Steps" className="lg:sticky lg:top-20 self-start">
          <p className="eyebrow text-ink-soft mb-3">
            Step {pad(idx + 1)} / {pad(steps.length)}
          </p>
          <ol className="relative flex lg:flex-col gap-1 overflow-x-auto scrollbar-none lg:overflow-visible">
            <span aria-hidden="true" className="hidden lg:block absolute left-[13px] top-3 bottom-3 w-px bg-hairline" />
            {steps.map((s, i) => {
              const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
              return (
                <li key={i} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={state === 'current' ? 'step' : undefined}
                    className="relative flex items-center gap-3 rounded-full lg:rounded-lg pr-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  >
                    <span
                      className={cx(
                        'relative z-10 w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] border transition-colors',
                        state === 'current' && 'bg-accent-500 border-accent-500 text-white',
                        state === 'done' && 'bg-moss-500 border-moss-500 text-white',
                        state === 'todo' && 'bg-paper border-hairline text-ink-soft'
                      )}
                    >
                      {state === 'done' ? <Check className="w-3.5 h-3.5" /> : pad(i + 1)}
                    </span>
                    <span
                      className={cx(
                        'hidden lg:block text-sm leading-snug line-clamp-2',
                        state === 'current' ? 'text-ink font-medium' : 'text-ink-soft'
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Current step */}
        <Card className="animate-fadeIn" key={idx}>
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow text-accent-700">Step {pad(idx + 1)}</span>
            {currentStep.isAdministratorRequired && (
              <Badge tone="amber">
                <ShieldAlert className="w-3.5 h-3.5" />
                {currentStep.actionType === 'terminal_cmd' ? 'Needs sudo' : 'Run as administrator'}
              </Badge>
            )}
          </div>

          <h2 className="mt-3 font-display font-semibold tracking-tight text-3xl sm:text-4xl text-ink leading-tight">{currentStep.title}</h2>
          {currentStep.description && <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">{currentStep.description}</p>}

          <div className="mt-6 space-y-3">
            {currentStep.command ? (
              <div className="rounded-xl bg-ink overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                  <span className="flex items-center gap-1.5 eyebrow text-white/50">
                    <Terminal className="w-3.5 h-3.5" />
                    {commandLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentStep.command || '')}
                    className="flex items-center gap-1 text-xs font-medium text-white/70 hover:text-accent-300 rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-accent-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="px-4 py-3.5 text-[13px] leading-relaxed text-accent-300 font-mono whitespace-pre-wrap break-all select-text">
                  {currentStep.command}
                </pre>
              </div>
            ) : (
              <Notice icon={<MousePointerClick className="w-4 h-4 text-ink-soft" />}>
                Do this on your computer, then come back and continue.
              </Notice>
            )}

            {currentStep.safetyCaution && (
              <Notice tone="warning" title="Before you continue">
                {currentStep.safetyCaution}
              </Notice>
            )}
            {currentStep.expectedOutcome && (
              <Notice tone="success" title="You should see">
                {currentStep.expectedOutcome}
              </Notice>
            )}
          </div>

          <div className="mt-8 pt-5 border-t border-hairline flex items-center gap-2">
            <Button variant="secondary" onClick={() => (idx > 0 ? goTo(idx - 1) : onBack())}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button variant="ghost" onClick={speakCurrentStep}>
              <RotateCcw className="w-4 h-4" />
              Repeat
            </Button>
            <Button
              className="ml-auto"
              variant={isLast ? 'accent' : 'primary'}
              onClick={() => {
                soundManager.playSoundEffect('step');
                if (isLast) onComplete();
                else goTo(idx + 1);
              }}
            >
              {isLast ? 'I’m done' : 'Next step'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}

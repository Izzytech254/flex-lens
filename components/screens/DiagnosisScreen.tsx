'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Volume2, VolumeX, ExternalLink, Camera, AlertTriangle } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';
import ReportActions from '@/components/ReportActions';
import { Badge, Button, Card, EmptyState, IconButton, Notice, Page, PageHeader, ProgressBar, SectionLabel } from '@/components/ui';

interface DiagnosisScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  onNext: () => void;
  onStartScan: () => void;
}

const PROBABILITY_TONE = { HIGH: 'red', MEDIUM: 'amber', LOW: 'neutral' } as const;
const PROBABILITY_LABEL = { HIGH: 'Likely', MEDIUM: 'Possible', LOW: 'Less likely' } as const;
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
      <Page size="sm">
        <Card>
          <EmptyState
            icon={<Camera className="w-6 h-6" />}
            title="No diagnosis yet"
            description="Scan an error on your screen or upload a screenshot to get a diagnosis."
            action={<Button onClick={onStartScan}>Start scanning</Button>}
          />
        </Card>
      </Page>
    );
  }

  const steps = report.troubleshootingSteps || [];
  const codes = report.detectedErrorCodes || [];
  const citations = (report.citations || []).filter((c) => /^https:\/\//.test(c.url));
  const causes = report.possibleCauses || [];
  const symptoms = report.observedSymptoms || [];
  const firstStep = steps[0];
  const recommendedAction = firstStep?.description || firstStep?.title || '';
  const confidencePct = Math.round((report.confidenceScore ?? CONFIDENCE_FALLBACK[report.confidence] ?? 0.5) * 100);
  const os = report.systemContext && report.systemContext !== 'Unknown OS' ? report.systemContext : null;

  const speakDiagnosis = () => {
    if (isSpeaking) {
      soundManager.stop();
      return;
    }
    const beats = [`Ok, here's what's happening. ... ${report.problemSummary}.`];
    if (causes.length > 0) beats.push(`Most likely, it's this. ... ${causes[0].title}.`);
    if (recommendedAction) beats.push("Let's start with the first fix. ... Tap Start the fix and I'll walk you through it.");
    soundManager.speak(beats.join(' ... '));
  };

  return (
    <Page size="md">
      <PageHeader
        eyebrow="02 / Diagnosis"
        title="Here’s what’s going on."
        description={`Diagnosed ${new Date(report.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`}
        onBack={onBack}
        backLabel="Back to scanner"
        actions={
          <IconButton label={isSpeaking ? 'Stop reading' : 'Read aloud'} variant={isSpeaking ? 'active' : 'secondary'} onClick={speakDiagnosis}>
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </IconButton>
        }
      />

      <div className="space-y-4">
        {/* Summary */}
        <Card>
          <div className="flex items-start gap-4">
            <span className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-semibold tracking-tight text-2xl text-ink leading-tight">{report.problemSummary}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {codes.map((c) => (
                  <Badge key={c} tone="red" mono>
                    {c}
                  </Badge>
                ))}
                {report.affectedComponent && report.affectedComponent !== 'Unknown component' && (
                  <Badge>{report.affectedComponent}</Badge>
                )}
                {os && <Badge>{os}</Badge>}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-hairline">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ink-soft">Confidence</span>
              <span className="font-medium text-ink tabular-nums">{confidencePct}%</span>
            </div>
            <ProgressBar value={confidencePct} label="Diagnosis confidence" />
          </div>
        </Card>

        {symptoms.length > 0 && (
          <Card>
            <SectionLabel>What FixLens saw</SectionLabel>
            <ul className="space-y-1.5 text-sm text-ink">
              {symptoms.map((s, idx) => (
                <li key={idx} className="flex gap-2.5">
                  <span className="mt-2 w-1 h-1 rounded-full bg-accent-500 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {causes.length > 0 && (
          <Card padded={false}>
            <div className="px-5 sm:px-6 pt-5 sm:pt-6">
              <SectionLabel>Likely causes</SectionLabel>
            </div>
            <ul className="divide-y divide-hairline">
              {causes.map((c, idx) => (
                <li key={idx} className="px-5 sm:px-6 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{c.title}</p>
                    {c.whyLikely && <p className="mt-0.5 text-sm text-ink-soft">{c.whyLikely}</p>}
                  </div>
                  <Badge tone={PROBABILITY_TONE[c.probability] || 'neutral'}>{PROBABILITY_LABEL[c.probability] || c.probability}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {recommendedAction && <Notice title="First step">{recommendedAction}</Notice>}

        {citations.length > 0 && (
          <Card>
            <SectionLabel>Sources</SectionLabel>
            <ul className="space-y-1.5">
              {citations.map((c) => (
                <li key={c.url}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1.5 text-sm text-accent-700 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    {c.sourceTitle}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="space-y-2 pt-2">
          <Button size="lg" fullWidth onClick={onNext} disabled={steps.length === 0}>
            {steps.length > 0 ? 'Start the fix' : 'No fix steps available — try rescanning'}
            {steps.length > 0 && <ArrowRight className="w-4 h-4" />}
          </Button>
          <ReportActions report={report} />
        </div>
      </div>
    </Page>
  );
}

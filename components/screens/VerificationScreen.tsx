'use client';

import React, { useState } from 'react';
import { Check, X, MessageSquare, HelpCircle } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { soundManager } from '@/lib/sound-feedback';
import ReportActions from '@/components/ReportActions';
import { Button, Card, Page, PageHeader } from '@/components/ui';

interface VerificationScreenProps {
  report: DiagnosisReport | null;
  onBack: () => void;
  /** Marks the report resolved (does not navigate) */
  onConfirmFixed: () => void;
  onNotFixed: () => void;
  onAskQuestion: () => void;
  onDone: () => void;
}

// FixLens can't see your PC after the steps, so the user confirms the result honestly.
export default function VerificationScreen({ report, onBack, onConfirmFixed, onNotFixed, onAskQuestion, onDone }: VerificationScreenProps) {
  const [fixed, setFixed] = useState(false);

  const confirmFixed = () => {
    soundManager.playSoundEffect('success');
    onConfirmFixed();
    setFixed(true);
  };

  return (
    <Page size="sm">
      <PageHeader
        eyebrow="04 / Confirm"
        title={fixed ? 'All sorted.' : 'Did that fix it?'}
        onBack={fixed ? undefined : onBack}
        backLabel="Fix guide"
      />

      <Card className="text-center">
        {fixed ? (
          <div className="py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-moss-100 text-moss-500 flex items-center justify-center">
              <Check className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <h2 className="mt-4 font-display font-semibold tracking-tight text-3xl text-ink">Problem solved</h2>
            <p className="mt-1 text-sm text-ink-soft">Saved to your history. Keep a copy of what was fixed:</p>
            <div className="mt-6 space-y-2 text-left">
              {report && <ReportActions report={{ ...report, resolved: true }} />}
              <Button size="lg" fullWidth onClick={onDone}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="mt-4 font-display font-semibold tracking-tight text-3xl text-ink">Is the error gone?</h2>
            <p className="mt-1 text-sm text-ink-soft max-w-sm mx-auto">
              {report?.problemSummary
                ? `Check whether “${report.problemSummary}” still shows up on your computer.`
                : 'Check whether the error still shows up on your computer.'}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="success" size="lg" onClick={confirmFixed}>
                <Check className="w-4 h-4" />
                Yes, it’s fixed
              </Button>
              <Button variant="secondary" size="lg" onClick={onNotFixed}>
                <X className="w-4 h-4" />
                Not yet
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={onAskQuestion} className="mt-4 text-accent-700">
              <MessageSquare className="w-4 h-4" />
              Ask FixLens about it
            </Button>
          </div>
        )}
      </Card>
    </Page>
  );
}

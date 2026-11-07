'use client';

import React, { useEffect, useState } from 'react';
import {
  Volume2,
  ShieldCheck,
  Download,
  Play,
  Cpu,
} from 'lucide-react';
import { soundManager } from '@/lib/sound-feedback';
import { Badge, Button, Card, Notice, Page, PageHeader, SectionLabel, Switch } from '@/components/ui';

interface SettingsScreenProps {
  onOpenCompanionModal: () => void;
}

export default function SettingsScreen({
  onOpenCompanionModal,
}: SettingsScreenProps) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled());
  }, []);

  const [speechHelp, setSpeechHelp] = useState<string | null>(null);

  const handleTestAudio = () => {
    setSpeechHelp(null);
    if (!soundManager.isEnabled()) {
      setTestStatus('Sound is off');
      setTimeout(() => setTestStatus(null), 2000);
      return;
    }
    setTestStatus('Playing...');
    soundManager.playSoundEffect('detect');

    let started = false;
    const unsub = soundManager.subscribeSpeaking((speaking) => {
      if (speaking) started = true;
    });
    setTimeout(() => soundManager.speak("Hey, it's FixLens. ... If you can hear me, voice guidance is working."), 300);

    // If speech never starts, explain why. (The natural voice takes a moment to generate.)
    setTimeout(() => {
      unsub();
      const status = soundManager.getSpeechStatus();
      if (started) {
        setTestStatus('Working');
      } else if (status.lastError && /natural voice/i.test(status.lastError)) {
        setTestStatus('No sound');
        setSpeechHelp(
          `The natural AI voice couldn't play (${status.lastError}). FixLens fell back to your system voice${
            status.voiceCount === 0
              ? ', but none are installed. On Linux: sudo apt install speech-dispatcher espeak-ng'
              : ''
          }. If this says 404 or "not found", the voice model name needs updating — send this message to your developer.`
        );
      } else if (!status.supported) {
        setTestStatus('Not supported');
        setSpeechHelp('This browser does not support text-to-speech. Try Chrome, Edge or Safari.');
      } else if (status.voiceCount === 0) {
        setTestStatus('No voices');
        setSpeechHelp(
          'Your system has no text-to-speech voices installed. On Linux, install them with: sudo apt install speech-dispatcher espeak-ng — then restart your browser.'
        );
      } else {
        setTestStatus('No sound');
        setSpeechHelp(
          `Speech didn't start${status.lastError ? ` (error: ${status.lastError})` : ''}. Check your volume and output device, then try again.`
        );
      }
      setTimeout(() => setTestStatus(null), 4000);
    }, 7000);
  };

  const statusTone =
    testStatus === 'Working' ? 'green' : testStatus === 'Playing...' ? 'blue' : testStatus ? 'amber' : 'neutral';

  return (
    <Page size="md">
      <PageHeader eyebrow="Preferences" title="Settings" description="Everything here is saved on this device." />

      <div className="space-y-6">
        {/* Voice */}
        <section>
          <SectionLabel>Voice guidance</SectionLabel>
          <Card padded={false} className="divide-y divide-hairline">
            <SettingRow
              icon={<Volume2 className="w-4.5 h-4.5" />}
              title="Voice and sounds"
              description="FixLens reads each step aloud and plays short sounds."
              control={
                <Switch
                  checked={soundEnabled}
                  label="Voice and sounds"
                  onChange={(next) => {
                    soundManager.setEnabled(next);
                    if (next) soundManager.playSoundEffect('click');
                    setSoundEnabled(next);
                  }}
                />
              }
            />
            <SettingRow
              icon={<Play className="w-4.5 h-4.5" />}
              title="Test voice"
              description="Plays a short sample so you can check your speakers."
              control={
                <div className="flex items-center gap-2">
                  {testStatus && <Badge tone={statusTone}>{testStatus}</Badge>}
                  <Button variant="secondary" size="sm" onClick={handleTestAudio} disabled={testStatus === 'Playing...'}>
                    Play sample
                  </Button>
                </div>
              }
            />
          </Card>
          {speechHelp && (
            <Notice tone="warning" className="mt-3 select-text">
              {speechHelp}
            </Notice>
          )}
        </section>

        {/* Companion */}
        <section>
          <SectionLabel>Windows PC Companion</SectionLabel>
          <Card padded={false} className="divide-y divide-hairline">
            <SettingRow
              icon={<ShieldCheck className="w-4.5 h-4.5" />}
              title={
                <span className="flex items-center gap-2">
                  PC Companion <Badge tone="amber">Preview</Badge>
                </span>
              }
              description="Share read-only system status from a Windows PC. Repair actions are simulated in this preview."
              control={
                <Button variant="secondary" size="sm" onClick={onOpenCompanionModal}>
                  Open
                </Button>
              }
            />
            <SettingRow
              icon={<Download className="w-4.5 h-4.5" />}
              title="Companion script"
              description="PowerShell script for Windows (FixLens-Companion.ps1)."
              control={
                <a
                  href="/api/companion/download?code=FXL-8821"
                  download
                  className="inline-flex items-center h-8 px-3.5 rounded-full text-xs font-medium border border-hairline bg-white text-ink hover:border-ink/30"
                >
                  Download
                </a>
              }
            />
          </Card>
        </section>

        {/* About */}
        <section>
          <SectionLabel>About</SectionLabel>
          <Card padded={false}>
            <SettingRow
              icon={<Cpu className="w-4.5 h-4.5" />}
              title="Diagnosis engine"
              description="Screen analysis, answers and voice are powered by Google Gemini."
            />
          </Card>
        </section>
      </div>
    </Page>
  );
}

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  control?: React.ReactNode;
}) {
  return (
    <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
      <span className="w-9 h-9 rounded-full bg-paper-deep text-ink-soft flex items-center justify-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{title}</div>
        {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

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

  const handleTestAudio = () => {
    if (!soundManager.isEnabled()) {
      setTestStatus('Sound is off');
      setTimeout(() => setTestStatus(null), 2000);
      return;
    }
    setTestStatus('Playing...');
    soundManager.playSoundEffect('detect');
    setTimeout(() => {
      soundManager.speak('FixLens audio output verified.');
      setTestStatus('Verified');
      setTimeout(() => setTestStatus(null), 3000);
    }, 300);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <h2 className="text-base font-extrabold text-slate-900">
          Settings
        </h2>
      </div>

      {/* Audio & Voice Narration */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Voice &amp; Sounds</h3>
              <p className="text-[11px] text-slate-500">Spoken guidance and sound effects (saved on this device)</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            aria-label="Voice narration and sounds"
            onClick={() => {
              const next = !soundEnabled;
              soundManager.setEnabled(next);
              if (next) soundManager.playSoundEffect('click');
              setSoundEnabled(next);
            }}
            className={`w-12 h-6 rounded-full transition p-0.5 cursor-pointer ${
              soundEnabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition shadow-sm ${
                soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={handleTestAudio}
          className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl text-xs font-bold flex items-center justify-between transition active:scale-98"
        >
          <span className="flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span>Test Sound & Speech</span>
          </span>
          <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">
            {testStatus || 'Play Sample'}
          </span>
        </button>
      </div>

      {/* Windows PC Companion */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                PC Companion{' '}
                <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Preview
                </span>
              </h3>
              <p className="text-[11px] font-mono text-slate-500 font-semibold">Demo pairing: FXL-8821</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCompanionModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Open Hub
          </button>
        </div>

        <a
          href="/api/companion/download?code=FXL-8821"
          download
          className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-between transition"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-500" />
            Download FixLens-Companion.ps1
          </span>
          <span className="text-[10px] font-mono text-slate-400">PowerShell</span>
        </a>
      </div>

      {/* Diagnostic Engine */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-2 font-bold text-slate-700">
          <Cpu className="w-4 h-4 text-blue-600" />
          Diagnosis engine
        </span>
        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
          Powered by Google Gemini
        </span>
      </div>
    </div>
  );
}

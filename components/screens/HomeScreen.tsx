'use client';

import React, { useRef } from 'react';
import { Camera, Wifi, Printer, RefreshCw, Upload, ArrowRight, MessageSquare, ScanLine, Volume2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import HeroScene from '@/components/HeroScene';

interface HomeScreenProps {
  onStartScanning: () => void;
  onSelectQuickHelp: (issue: 'wifi' | 'printer' | 'update') => void;
  onOpenVoiceModal: () => void;
  /** Receives the uploaded screenshot as a data URL */
  onUploadImage: (dataUrl: string) => void;
}

const EXAMPLES = [
  { id: 'wifi' as const, title: 'Wi-Fi won’t connect', code: '0x800704cf', Icon: Wifi },
  { id: 'printer' as const, title: 'Printer not found', code: '0x000006ba', Icon: Printer },
  { id: 'update' as const, title: 'Update keeps failing', code: '0x80070002', Icon: RefreshCw },
];

const STEPS = [
  {
    n: '01',
    Icon: ScanLine,
    title: 'Point and scan',
    body: 'Aim your phone or webcam at the error, or upload a screenshot. FixLens finds the message and the code on its own.',
  },
  {
    n: '02',
    Icon: Volume2,
    title: 'Get talked through it',
    body: 'It explains what went wrong in plain words, then guides you one step at a time — out loud and on screen.',
  },
  {
    n: '03',
    Icon: CheckCircle2,
    title: 'Confirm it’s fixed',
    body: 'FixLens watches your screen as you go, notices when the error is gone, and keeps a report of what was fixed.',
  },
];

export default function HomeScreen({ onStartScanning, onSelectQuickHelp, onOpenVoiceModal, onUploadImage }: HomeScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') onUploadImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-fadeIn">
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        {/* Workbench backdrop: cutting-mat grid, warm light behind the devices, paper grain, ruler edge */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 mat-grid [mask-image:radial-gradient(ellipse_80%_70%_at_65%_45%,black_35%,transparent_85%)]" />
          <div className="absolute right-[-10%] top-[8%] w-[70%] max-w-[820px] aspect-square rounded-full bg-[radial-gradient(closest-side,rgba(229,88,42,0.16),rgba(229,88,42,0.06)_55%,transparent)]" />
          <div className="absolute left-[-15%] bottom-[-30%] w-[50%] aspect-square rounded-full bg-[radial-gradient(closest-side,rgba(47,107,79,0.08),transparent)]" />
          <div className="absolute inset-0 grain opacity-[0.35] mix-blend-multiply" />
          <div className="absolute inset-x-0 bottom-0 h-4 ruler-ticks" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3 py-1 text-xs text-ink-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              AI technician for Windows, macOS &amp; Linux
            </p>

            <h1 className="mt-6 font-display font-semibold tracking-[-0.03em] text-ink text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.02]">
              Point your phone.
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">Fix</span>
                <span aria-hidden="true" className="absolute left-[-2%] right-[-4%] bottom-[0.08em] h-[0.32em] bg-accent-300/70 rounded-sm" />
              </span>{' '}
              your computer.
            </h1>

            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-lg">
              FixLens reads the error on your screen, explains it like a friend who fixes computers, and talks you through the fix — step by
              step, while it watches.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button size="lg" variant="accent" onClick={onStartScanning} className="w-full sm:w-auto">
                <Camera className="w-5 h-5" />
                Start scanning
              </Button>
              <Button size="lg" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                <Upload className="w-5 h-5 text-ink-soft" />
                Upload a screenshot
              </Button>
            </div>

            <button
              type="button"
              onClick={onOpenVoiceModal}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink rounded"
            >
              <MessageSquare className="w-4 h-4" />
              No error on screen? Describe the problem instead
            </button>

            <dl className="mt-12 grid grid-cols-3 max-w-md border-t border-hairline pt-5">
              {[
                ['Free', 'no sign-up'],
                ['0 installs', 'runs in the browser'],
                ['Private', 'history stays on device'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-display font-semibold text-ink text-lg">{k}</dt>
                  <dd className="text-xs text-ink-soft mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          <HeroScene />
        </div>
      </section>

      {/* ------------------------------------------------------------ How it works */}
      <section aria-labelledby="how-heading" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-accent-600">How it works</p>
          <h2 id="how-heading" className="mt-3 font-display font-semibold tracking-[-0.02em] text-4xl sm:text-5xl leading-[1.05] text-ink">
            Like having a technician sitting next to you.
          </h2>
        </div>

        <ol className="mt-14 grid gap-px bg-hairline border border-hairline rounded-2xl overflow-hidden sm:grid-cols-3">
          {STEPS.map(({ n, Icon, title, body }) => (
            <li key={n} className="bg-paper p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-ink text-accent-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-mono text-sm text-ink-soft/70">{n}</span>
              </div>
              <h3 className="mt-6 font-display font-semibold text-xl text-ink">{title}</h3>
              <p className="mt-2 text-[15px] text-ink-soft leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ Examples */}
      <section aria-labelledby="examples-heading" className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24 grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16 items-start">
          <div>
            <p className="eyebrow text-accent-400">Try it now</p>
            <h2 id="examples-heading" className="mt-3 font-display font-semibold tracking-[-0.02em] text-4xl sm:text-5xl leading-[1.05]">
              No camera handy? Start with a real error.
            </h2>
            <p className="mt-4 text-[15px] text-paper/70 leading-relaxed max-w-md">
              Pick one of these common problems and watch FixLens diagnose it and walk you through the fix.
            </p>
          </div>

          <ul className="divide-y divide-white/10 border-y border-white/10">
            {EXAMPLES.map(({ id, title, code, Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectQuickHelp(id)}
                  className="w-full py-5 flex items-center gap-5 text-left group rounded-sm focus-visible:outline-none focus-visible:bg-white/5"
                >
                  <span className="w-11 h-11 rounded-xl border border-white/15 text-paper/80 flex items-center justify-center shrink-0 group-hover:border-accent-400 group-hover:text-accent-400 transition-colors">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-semibold text-xl text-paper">{title}</span>
                    <span className="block mt-0.5 font-mono text-xs text-paper/50">{code}</span>
                  </span>
                  <ArrowRight className="w-5 h-5 text-paper/30 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

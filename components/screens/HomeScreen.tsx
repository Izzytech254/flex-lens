'use client';

import React, { useRef } from 'react';
import {
  Camera,
  MessageSquare,
  Wifi,
  Printer,
  RefreshCw,
  Upload,
  ShieldCheck,
  Download,
  ArrowRight,
} from 'lucide-react';

interface HomeScreenProps {
  onStartScanning: () => void;
  onSelectQuickHelp: (issue: 'wifi' | 'printer' | 'update') => void;
  onOpenVoiceModal: () => void;
  onOpenCompanion: () => void;
  /** Receives the uploaded screenshot as a data URL */
  onUploadImage: (dataUrl: string) => void;
}

export default function HomeScreen({
  onStartScanning,
  onSelectQuickHelp,
  onOpenVoiceModal,
  onOpenCompanion,
  onUploadImage,
}: HomeScreenProps) {
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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 select-none animate-fadeIn">
      {/* Hero Section matching FixLens showcase */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          Fix computer errors with your camera
        </h1>
        <p className="text-base sm:text-xl font-bold text-slate-600">
          Windows, Mac or Linux — point FixLens at the error and it&apos;ll talk you through the fix, one step at a time.
        </p>
      </div>

      {/* Main Action Card matching Showcase Screen 3 */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onStartScanning}
          className="w-full py-5 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-3xl font-extrabold text-base sm:text-lg shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 transition active:scale-[0.99] group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span>Start Scanning</span>
        </button>

        <p className="text-center text-xs font-semibold text-slate-400">
          Point your camera at your computer screen
        </p>

        {/* Secondary Pill Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenVoiceModal}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 rounded-full font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition active:scale-98"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Ask FixLens...</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-full font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Upload Screenshot</span>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Quick Help Section matching Showcase Screen 3 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            Quick Help
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            Common issues
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Wi-Fi Problems */}
          <div
            onClick={() => onSelectQuickHelp('wifi')}
            className="p-5 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs transition cursor-pointer flex flex-col items-center justify-center text-center gap-3 group active:scale-98"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <Wifi className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                Wi-Fi Problems
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                0x800704cf
              </span>
            </div>
          </div>

          {/* Card 2: Printer Issues */}
          <div
            onClick={() => onSelectQuickHelp('printer')}
            className="p-5 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs transition cursor-pointer flex flex-col items-center justify-center text-center gap-3 group active:scale-98"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <Printer className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                Printer Issues
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                0x000006ba
              </span>
            </div>
          </div>

          {/* Card 3: Windows Updates */}
          <div
            onClick={() => onSelectQuickHelp('update')}
            className="p-5 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs transition cursor-pointer flex flex-col items-center justify-center text-center gap-3 group active:scale-98"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <RefreshCw className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                Windows Updates
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                0x80070002
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Windows Companion PC Link */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Windows Companion PC Agent{' '}
              <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                Preview
              </span>
            </h4>
            <span className="text-[11px] font-mono font-semibold text-slate-400">
              Pairing Code: FXL-8821
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenCompanion}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            Open Hub
          </button>
          <a
            href="/api/companion/download?code=FXL-8821"
            download
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.ps1</span>
          </a>
        </div>
      </div>
    </div>
  );
}

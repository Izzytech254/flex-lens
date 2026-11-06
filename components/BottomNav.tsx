'use client';

import React from 'react';
import { Home, History, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'history' | 'settings';
  onChangeTab: (tab: 'home' | 'history' | 'settings') => void;
}

export default function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-2 flex items-center justify-around shrink-0 z-30 shadow-sm">
      <button
        type="button"
        onClick={() => onChangeTab('home')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Home className={`w-5 h-5 ${activeTab === 'home' ? 'fill-blue-50' : ''}`} />
        <span className="text-[11px]">Home</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('history')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'history' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <History className={`w-5 h-5 ${activeTab === 'history' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[11px]">History</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('settings')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'settings' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[11px]">Settings</span>
      </button>
    </div>
  );
}

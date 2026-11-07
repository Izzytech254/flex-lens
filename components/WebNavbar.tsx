'use client';

import React, { useState } from 'react';
import {
  Camera,
  Wrench,
  History,
  Settings,
  MessageSquare,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import AudioWaveIndicator from '@/components/AudioWaveIndicator';
import type { ScreenType } from '@/components/FixLensApp';

interface WebNavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenVoiceModal: () => void;
  onOpenCompanionModal: () => void;
  hasActiveReport: boolean;
}

export default function WebNavbar({
  currentScreen,
  onNavigate,
  onOpenVoiceModal,
  onOpenCompanionModal,
  hasActiveReport,
}: WebNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{
    id: ScreenType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: 'Home', icon: Camera },
    { id: 'scanner', label: 'Scan', icon: Camera },
    ...(hasActiveReport
      ? [{ id: 'fixguide' as ScreenType, label: 'Fix Guide', icon: Wrench }]
      : []),
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (screen: ScreenType) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo matching FixLens showcase: Camera lens with brackets */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => onNavigate('home')}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                FixLens
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <AudioWaveIndicator />

            <button
              type="button"
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              title="Voice Assistant"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            <button
              type="button"
              onClick={onOpenCompanionModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition border border-blue-200/60"
              title="Pair with Windows PC"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>FXL-8821</span>
            </button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold ${
                currentScreen === item.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenCompanionModal();
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50"
          >
            PC Companion (FXL-8821)
          </button>
        </div>
      )}
    </header>
  );
}

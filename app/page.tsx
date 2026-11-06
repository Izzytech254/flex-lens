'use client';

import React, { useState } from 'react';
import WebNavbar from '@/components/WebNavbar';
import SplashScreen from '@/components/screens/SplashScreen';
import OnboardingScreen from '@/components/screens/OnboardingScreen';
import HomeScreen from '@/components/screens/HomeScreen';
import ScannerScreen from '@/components/screens/ScannerScreen';
import DiagnosisScreen from '@/components/screens/DiagnosisScreen';
import FixGuideScreen from '@/components/screens/FixGuideScreen';
import VerificationScreen from '@/components/screens/VerificationScreen';
import HistoryScreen from '@/components/screens/HistoryScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import WindowsCompanionModal from '@/components/WindowsCompanionModal';
import AskFixLensModal from '@/components/AskFixLensModal';
import { DiagnosisReport } from '@/types/technician';

export type ScreenType =
  | 'splash'
  | 'onboarding'
  | 'home'
  | 'scanner'
  | 'diagnosis'
  | 'fixguide'
  | 'verification'
  | 'history'
  | 'settings';

export default function FixLensApp() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Active Diagnosis & Session Data
  const [activeReport, setActiveReport] = useState<DiagnosisReport | null>(null);
  const [selectedPresetIssue, setSelectedPresetIssue] = useState<'wifi' | 'printer' | 'update' | null>(null);

  // Modals
  const [showCompanionModal, setShowCompanionModal] = useState<boolean>(false);
  const [showAskFixLensModal, setShowAskFixLensModal] = useState<boolean>(false);

  // Local storage history
  const [historyList, setHistoryList] = useState<DiagnosisReport[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('fixlens_history_v2');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  const saveToHistory = (report: DiagnosisReport) => {
    try {
      const updated = [report, ...historyList.filter((item) => item.id !== report.id)].slice(0, 15);
      setHistoryList(updated);
      localStorage.setItem('fixlens_history_v2', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc] flex flex-col text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sleek Top Navigation Bar */}
      <WebNavbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onOpenVoiceModal={() => setShowAskFixLensModal(true)}
        onOpenCompanionModal={() => setShowCompanionModal(true)}
        hasActiveReport={!!activeReport}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        {/* Screen 1: Splash */}
        {currentScreen === 'splash' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
              <SplashScreen onNext={() => setCurrentScreen('onboarding')} />
            </div>
          </div>
        )}

        {/* Screen 2: Onboarding */}
        {currentScreen === 'onboarding' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
              <OnboardingScreen onGetStarted={() => setCurrentScreen('home')} />
            </div>
          </div>
        )}

        {/* Screen 3: Home Dashboard */}
        {currentScreen === 'home' && (
          <HomeScreen
            onStartScanning={() => {
              setSelectedPresetIssue(null);
              setCurrentScreen('scanner');
            }}
            onSelectQuickHelp={(issue) => {
              setSelectedPresetIssue(issue);
              setCurrentScreen('scanner');
            }}
            onOpenVoiceModal={() => setShowAskFixLensModal(true)}
            onChangeTab={(tab) => {
              if (tab === 'history') setCurrentScreen('history');
              if (tab === 'settings') setCurrentScreen('settings');
            }}
            onOpenCompanion={() => setShowCompanionModal(true)}
          />
        )}

        {/* Screen 4: Scanner */}
        {currentScreen === 'scanner' && (
          <ScannerScreen
            initialPreset={selectedPresetIssue}
            onClose={() => setCurrentScreen('home')}
            onAnalyzed={(report, options) => {
              setActiveReport(report);
              saveToHistory(report);
              if (options?.autoNavigate) {
                setCurrentScreen('diagnosis');
              }
            }}
          />
        )}

        {/* Screen 5: Diagnosis */}
        {currentScreen === 'diagnosis' && (
          <DiagnosisScreen
            report={activeReport}
            onBack={() => setCurrentScreen('scanner')}
            onNext={() => setCurrentScreen('fixguide')}
          />
        )}

        {/* Screen 6: Fix Guide */}
        {currentScreen === 'fixguide' && (
          <FixGuideScreen
            report={activeReport}
            onBack={() => setCurrentScreen('diagnosis')}
            onComplete={() => setCurrentScreen('verification')}
          />
        )}

        {/* Screen 7: Verification */}
        {currentScreen === 'verification' && (
          <VerificationScreen
            subtitle={
              activeReport
                ? `${activeReport.problemSummary} is resolved.`
                : 'Your computer is working properly.'
            }
            onBack={() => setCurrentScreen('fixguide')}
            onDone={() => setCurrentScreen('home')}
            onAskQuestion={() => setShowAskFixLensModal(true)}
            onViewDetails={() => setCurrentScreen('diagnosis')}
            onSaveToHistory={() => {
              if (activeReport) saveToHistory(activeReport);
              setCurrentScreen('history');
            }}
          />
        )}

        {/* Screen 8: History */}
        {currentScreen === 'history' && (
          <HistoryScreen
            history={historyList}
            onSelectReport={(report) => {
              setActiveReport(report);
              setCurrentScreen('diagnosis');
            }}
            onChangeTab={(tab) => {
              if (tab === 'home') setCurrentScreen('home');
              if (tab === 'settings') setCurrentScreen('settings');
            }}
            onClearHistory={() => {
              setHistoryList([]);
              localStorage.removeItem('fixlens_history_v2');
            }}
            onLaunchScan={(preset) => {
              setSelectedPresetIssue(preset || null);
              setCurrentScreen('scanner');
            }}
          />
        )}

        {/* Settings Screen */}
        {currentScreen === 'settings' && (
          <SettingsScreen
            onChangeTab={(tab) => {
              if (tab === 'home') setCurrentScreen('home');
              if (tab === 'history') setCurrentScreen('history');
            }}
            onOpenCompanionModal={() => setShowCompanionModal(true)}
          />
        )}
      </main>

      {/* Windows Companion Modal */}
      {showCompanionModal && (
        <WindowsCompanionModal
          onClose={() => setShowCompanionModal(false)}
        />
      )}

      {/* Ask FixLens Modal */}
      {showAskFixLensModal && (
        <AskFixLensModal
          report={activeReport}
          onClose={() => setShowAskFixLensModal(false)}
        />
      )}
    </div>
  );
}

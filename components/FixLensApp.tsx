'use client';

import React, { useCallback, useEffect, useState } from 'react';
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

export type PresetIssue = 'wifi' | 'printer' | 'update';

const HISTORY_KEY = 'fixlens_history_v2';
const HISTORY_LIMIT = 15;

function persistHistory(list: DiagnosisReport[]) {
  try {
    // Captured images are large; drop them from persisted history to stay under the localStorage quota.
    const slim = list.map(({ capturedImage: _img, ...rest }) => rest);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn('Could not save history', e);
  }
}

export default function FixLensApp() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Active diagnosis & session data
  const [activeReport, setActiveReport] = useState<DiagnosisReport | null>(null);
  const [selectedPresetIssue, setSelectedPresetIssue] = useState<PresetIssue | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // Modals
  const [showCompanionModal, setShowCompanionModal] = useState<boolean>(false);
  const [showAskFixLensModal, setShowAskFixLensModal] = useState<boolean>(false);

  // History is loaded after mount so server and client render the same markup.
  const [historyList, setHistoryList] = useState<DiagnosisReport[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistoryList(parsed);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const saveToHistory = useCallback((report: DiagnosisReport) => {
    setHistoryList((prev) => {
      const updated = [report, ...prev.filter((item) => item.id !== report.id)].slice(0, HISTORY_LIMIT);
      persistHistory(updated);
      return updated;
    });
  }, []);

  const markResolved = useCallback((report: DiagnosisReport, resolved: boolean) => {
    const updatedReport = { ...report, resolved };
    setActiveReport(updatedReport);
    saveToHistory(updatedReport);
  }, [saveToHistory]);

  const openScanner = (preset: PresetIssue | null = null, image: string | null = null) => {
    setSelectedPresetIssue(preset);
    setPendingImage(image);
    setCurrentScreen('scanner');
  };

  const handleAnalyzed = useCallback(
    (report: DiagnosisReport, options?: { autoNavigate?: boolean }) => {
      setActiveReport(report);
      saveToHistory(report);
      if (options?.autoNavigate) setCurrentScreen('diagnosis');
    },
    [saveToHistory]
  );

  return (
    <div className="min-h-screen bg-[#f5f8fc] flex flex-col text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      <WebNavbar
        currentScreen={currentScreen}
        onNavigate={(screen) => (screen === 'scanner' ? openScanner() : setCurrentScreen(screen))}
        onOpenVoiceModal={() => setShowAskFixLensModal(true)}
        onOpenCompanionModal={() => setShowCompanionModal(true)}
        hasActiveReport={!!activeReport}
      />

      <main id="app" className="flex-1 w-full flex flex-col">
        {currentScreen === 'splash' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
              <SplashScreen onNext={() => setCurrentScreen('onboarding')} />
            </div>
          </div>
        )}

        {currentScreen === 'onboarding' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
              <OnboardingScreen onGetStarted={() => setCurrentScreen('home')} />
            </div>
          </div>
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            onStartScanning={() => openScanner()}
            onSelectQuickHelp={(issue) => openScanner(issue)}
            onUploadImage={(dataUrl) => openScanner(null, dataUrl)}
            onOpenVoiceModal={() => setShowAskFixLensModal(true)}
            onOpenCompanion={() => setShowCompanionModal(true)}
          />
        )}

        {currentScreen === 'scanner' && (
          <ScannerScreen
            initialPreset={selectedPresetIssue}
            initialImage={pendingImage}
            onClose={() => setCurrentScreen('home')}
            onAnalyzed={handleAnalyzed}
          />
        )}

        {currentScreen === 'diagnosis' && (
          <DiagnosisScreen
            report={activeReport}
            onBack={() => openScanner()}
            onNext={() => setCurrentScreen('fixguide')}
            onStartScan={() => openScanner()}
          />
        )}

        {currentScreen === 'fixguide' && (
          <FixGuideScreen
            report={activeReport}
            onBack={() => setCurrentScreen('diagnosis')}
            onComplete={() => setCurrentScreen('verification')}
            onStartScan={() => openScanner()}
          />
        )}

        {currentScreen === 'verification' && (
          <VerificationScreen
            problemSummary={activeReport?.problemSummary}
            onBack={() => setCurrentScreen('fixguide')}
            onConfirmFixed={() => {
              if (activeReport) markResolved(activeReport, true);
              setCurrentScreen('history');
            }}
            onNotFixed={() => {
              if (activeReport) markResolved(activeReport, false);
              openScanner();
            }}
            onAskQuestion={() => setShowAskFixLensModal(true)}
            onViewDetails={() => setCurrentScreen('diagnosis')}
          />
        )}

        {currentScreen === 'history' && (
          <HistoryScreen
            history={historyList}
            onSelectReport={(report) => {
              setActiveReport(report);
              setCurrentScreen('diagnosis');
            }}
            onClearHistory={() => {
              setHistoryList([]);
              try {
                localStorage.removeItem(HISTORY_KEY);
              } catch {
                // ignore
              }
            }}
            onLaunchScan={(preset) => openScanner(preset || null)}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen onOpenCompanionModal={() => setShowCompanionModal(true)} />
        )}
      </main>

      {showCompanionModal && <WindowsCompanionModal onClose={() => setShowCompanionModal(false)} />}

      {showAskFixLensModal && (
        <AskFixLensModal report={activeReport} onClose={() => setShowAskFixLensModal(false)} />
      )}
    </div>
  );
}

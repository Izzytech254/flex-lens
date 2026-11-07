'use client';

import React, { useCallback, useEffect, useState } from 'react';
import WebNavbar from '@/components/WebNavbar';
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

  // Must stay referentially stable: the scanner's live loop depends on it.
  const handleAnalyzed = useCallback(
    (report: DiagnosisReport, options?: { autoNavigate?: boolean }) => {
      setActiveReport(report);
      saveToHistory(report);
      if (options?.autoNavigate) setCurrentScreen('diagnosis');
    },
    [saveToHistory]
  );

  return (
    <div className="min-h-screen bg-paper flex flex-col text-ink antialiased">
      <WebNavbar
        currentScreen={currentScreen}
        onNavigate={(screen) => (screen === 'scanner' ? openScanner() : setCurrentScreen(screen))}
        onOpenVoiceModal={() => setShowAskFixLensModal(true)}
        hasActiveReport={!!activeReport}
      />

      {/* The page footer (SiteInfo) carries the extra bottom padding for the mobile tab bar */}
      <main id="app" className="flex-1 w-full flex flex-col">
        {currentScreen === 'home' && (
          <HomeScreen
            onStartScanning={() => openScanner()}
            onSelectQuickHelp={(issue) => openScanner(issue)}
            onUploadImage={(dataUrl) => openScanner(null, dataUrl)}
            onOpenVoiceModal={() => setShowAskFixLensModal(true)}
          />
        )}

        {currentScreen === 'scanner' && (
          <ScannerScreen
            initialPreset={selectedPresetIssue}
            initialImage={pendingImage}
            onClose={() => setCurrentScreen('home')}
            onAnalyzed={handleAnalyzed}
            onResolved={(report) => {
              markResolved(report, true);
              setCurrentScreen('history');
            }}
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
            report={activeReport}
            onBack={() => setCurrentScreen('fixguide')}
            onConfirmFixed={() => {
              if (activeReport) markResolved(activeReport, true);
            }}
            onNotFixed={() => {
              if (activeReport) markResolved(activeReport, false);
              openScanner();
            }}
            onAskQuestion={() => setShowAskFixLensModal(true)}
            onDone={() => setCurrentScreen('history')}
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

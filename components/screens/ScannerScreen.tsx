'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Zap,
  ZapOff,
  Image as ImageIcon,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  Camera,
  Loader2,
  Mic,
} from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { REAL_WORLD_SCENARIOS } from '@/lib/scenarios';
import { soundManager } from '@/lib/sound-feedback';

interface ScannerScreenProps {
  onClose: () => void;
  onAnalyzed: (
    resultReport: DiagnosisReport,
    options?: { isContinuous?: boolean; autoNavigate?: boolean }
  ) => void;
  initialPreset?: 'wifi' | 'printer' | 'update' | null;
}

export default function ScannerScreen({
  onClose,
  onAnalyzed,
  initialPreset,
}: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const continuousTimerRef = useRef<any>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const lastSpokenTextRef = useRef<string>('');

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeFrameImage, setActiveFrameImage] = useState<string | null>(null);

  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Scanning...');

  // Detection results
  const [detectedError, setDetectedError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [affectedComponent, setAffectedComponent] = useState<string | null>(null);
  const [spokenGuidance, setSpokenGuidance] = useState<string | null>(null);
  const [boundingBox, setBoundingBox] = useState<{
    topPercent: number;
    leftPercent: number;
    widthPercent: number;
    heightPercent: number;
    label?: string;
  } | null>(null);
  const [latestReport, setLatestReport] = useState<DiagnosisReport | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);

  const speakVoiceFeedback = useCallback(
    (text: string) => {
      if (isMuted || !text) return;
      soundManager.playSoundEffect('detect');
      soundManager.speak(text);
    },
    [isMuted]
  );

  const initPersistentCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setCameraActive(true);
      setActiveFrameImage(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((err) => console.warn(err));
      }
    } catch (e: any) {
      setCameraActive(false);
      setCameraError('Camera unavailable. Upload a screenshot or pick a test target below.');
    }
  }, [facingMode]);

  const stopPersistentCamera = useCallback(() => {
    if (continuousTimerRef.current) {
      clearInterval(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    soundManager.stop();
    setCameraActive(false);
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const caps = (track.getCapabilities && track.getCapabilities()) || {};
      if ('torch' in caps) {
        const next = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: next } as any] });
        setTorchOn(next);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const grabCurrentFrame = useCallback((): string => {
    if (activeFrameImage) return activeFrameImage;
    if (!videoRef.current || videoRef.current.videoWidth === 0) return '';
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [activeFrameImage]);

  const processRealFrame = useCallback(async (isManualTrigger = false) => {
    if (isProcessingFrameRef.current) return;
    const frameBase64 = grabCurrentFrame();
    if (!frameBase64) return;

    isProcessingFrameRef.current = true;
    setIsProcessingFrame(true);
    setStatusText('Analysing your screen...');

    try {
      const res = await fetch('/api/realtime-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameBase64,
          sessionContext: { detectedError, affectedComponent },
          currentStepNumber: 1,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.analysis) {
        throw new Error(data.error || 'Failed');
      }

      const a = data.analysis;

      if (a.screenState === 'ERROR_ACTIVE' || a.detectedError) {
        const errTitle = a.detectedError || 'Detected Error';
        const code = a.errorCode || 'N/A';
        const comp = a.affectedComponent || 'Windows';
        const voiceText =
          a.realtimeSpokenGuidance ||
          `Detected ${errTitle}. ${a.currentActionInstruction || 'Follow steps to fix.'}`;

        setDetectedError(errTitle);
        setDetectedCode(code);
        setAffectedComponent(comp);
        setSpokenGuidance(voiceText);

        if (a.boundingBoxHint) {
          setBoundingBox(a.boundingBoxHint);
        }

        setStatusText(code !== 'N/A' ? code : 'Found');

        if (voiceText && voiceText !== lastSpokenTextRef.current) {
          lastSpokenTextRef.current = voiceText;
          speakVoiceFeedback(voiceText);
        }

        const reportObj: DiagnosisReport = {
          id: 'fl_' + Date.now().toString(36),
          createdAt: new Date().toISOString(),
          problemSummary: errTitle,
          detectedErrorCodes: code !== 'N/A' ? [code] : [],
          affectedComponent: comp,
          systemContext: 'Windows',
          observedSymptoms: [
            'A Wi-Fi connection issue',
            'A network settings problem',
            'A temporary glitch',
          ],
          confirmedFacts: [`Detected on screen: ${code}`],
          possibleCauses:
            Array.isArray(a.possibleCauses) && a.possibleCauses.length > 0
              ? a.possibleCauses.map((c: string) => ({
                  title: typeof c === 'string' ? c : String(c),
                  probability: 'HIGH' as const,
                  evidence: `Code ${code}`,
                  whyLikely: a.resolutionDetails || 'Verified',
                  isConfirmed: true,
                }))
              : [
                  {
                    title: 'A Wi-Fi connection issue',
                    probability: 'HIGH' as const,
                    evidence: `Code ${code}`,
                    whyLikely: 'Detected on display',
                    isConfirmed: true,
                  },
                  {
                    title: 'A network settings problem',
                    probability: 'MEDIUM' as const,
                    evidence: 'Subsystem service check',
                    whyLikely: 'Driver configuration',
                    isConfirmed: false,
                  },
                  {
                    title: 'A temporary glitch',
                    probability: 'LOW' as const,
                    evidence: 'Transient state',
                    whyLikely: 'Transient socket error',
                    isConfirmed: false,
                  },
                ],
          missingInformation: [],
          recommendedTests: [],
          troubleshootingSteps:
            Array.isArray(a.troubleshootingSteps) && a.troubleshootingSteps.length > 0
              ? a.troubleshootingSteps.map((st: any, idx: number) => ({
                  stepNumber: st.stepNumber || idx + 1,
                  title: st.title || (idx === 0 ? 'Open Windows Settings' : `Step ${idx + 1}`),
                  description: st.description || (idx === 0 ? 'Click the Start menu and select Settings.' : 'Follow instruction.'),
                  simpleExplanation: st.description || 'Follow instruction.',
                  actionType: st.command ? ('powershell_cmd' as const) : ('gui_action' as const),
                  command: st.command && st.command !== 'N/A' ? st.command : undefined,
                  isAdministratorRequired: true,
                  expectedOutcome: 'Step completed',
                  verificationCriteria: 'Status indicator updates',
                  status: 'pending' as const,
                }))
              : [
                  {
                    stepNumber: 1,
                    title: 'Open Windows Settings',
                    description: 'Click the Start menu and select Settings.',
                    simpleExplanation: 'Open Settings.',
                    actionType: 'gui_action' as const,
                    isAdministratorRequired: false,
                    expectedOutcome: 'Settings opens',
                    verificationCriteria: 'Settings visible',
                    status: 'pending' as const,
                  },
                  {
                    stepNumber: 2,
                    title: 'Restart Network Adapter',
                    description: 'Reset TCP/IP stack and restart the Wi-Fi service.',
                    simpleExplanation: 'Reset Wi-Fi service.',
                    actionType: 'powershell_cmd' as const,
                    command: 'Restart-Service -Name WlanSvc -Force; ipconfig /flushdns',
                    isAdministratorRequired: true,
                    expectedOutcome: 'Network adapter reset',
                    verificationCriteria: 'Reconnected',
                    status: 'pending' as const,
                  },
                ],
          citations: [
            {
              sourceTitle: 'Microsoft Learn',
              authority: 'Microsoft Learn',
              url: 'https://learn.microsoft.com',
              summary: 'Official troubleshooting procedure',
            },
          ],
          confidence: 'HIGH',
          capturedImage: frameBase64,
          mode: 'camera_visual',
        };

        setLatestReport(reportObj);
        onAnalyzed(reportObj, { isContinuous: true, autoNavigate: isManualTrigger });
      } else {
        setStatusText('Scanning...');
        setBoundingBox(null);
      }
    } catch (err: any) {
      setStatusText('Scanning...');
    } finally {
      isProcessingFrameRef.current = false;
      setIsProcessingFrame(false);
    }
  }, [grabCurrentFrame, detectedError, affectedComponent, speakVoiceFeedback, onAnalyzed]);

  // Periodic frame check
  useEffect(() => {
    const initialTimer = setTimeout(() => processRealFrame(false), 1200);
    continuousTimerRef.current = setInterval(() => processRealFrame(false), 6000);
    return () => {
      clearTimeout(initialTimer);
      if (continuousTimerRef.current) clearInterval(continuousTimerRef.current);
    };
  }, [processRealFrame]);

  useEffect(() => {
    const t = setTimeout(() => initPersistentCamera(), 10);
    return () => {
      clearTimeout(t);
      stopPersistentCamera();
    };
  }, [initPersistentCamera, stopPersistentCamera]);

  const rasterizeToJpeg = useCallback((rawUrl: string, onReady: (jpegUrl: string) => void) => {
    if (typeof window === 'undefined') return;
    if (rawUrl.startsWith('data:image/jpeg;base64,') || rawUrl.startsWith('data:image/png;base64,')) {
      onReady(rawUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, 1280, 800);
        ctx.drawImage(img, 0, 0, 1280, 800);
        onReady(canvas.toDataURL('image/jpeg', 0.92));
      } else {
        onReady(rawUrl);
      }
    };
    img.onerror = () => onReady(rawUrl);
    img.src = rawUrl;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      rasterizeToJpeg(dataUrl, (jpegUrl) => {
        setActiveFrameImage(jpegUrl);
        lastSpokenTextRef.current = '';
        setTimeout(() => processRealFrame(false), 300);
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLoadScenario = useCallback((sc: any) => {
    rasterizeToJpeg(sc.imageUrl, (jpegUrl) => {
      setActiveFrameImage(jpegUrl);
      lastSpokenTextRef.current = '';
      setTimeout(() => processRealFrame(false), 300);
    });
  }, [rasterizeToJpeg, processRealFrame]);

  useEffect(() => {
    if (initialPreset) {
      let scenarioId = 'scenario-wifi';
      if (initialPreset === 'printer') scenarioId = 'scenario-printer';
      if (initialPreset === 'update') scenarioId = 'scenario-update';
      const found = REAL_WORLD_SCENARIOS.find((s) => s.id === scenarioId);
      if (found) {
        const timer = setTimeout(() => handleLoadScenario(found), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [initialPreset, handleLoadScenario]);

  const handleManualCaptureAndProceed = () => {
    if (latestReport) {
      stopPersistentCamera();
      onAnalyzed(latestReport, { autoNavigate: true });
    } else {
      processRealFrame(true);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 select-none animate-fadeIn space-y-4">
      {/* Top Header Row matching Showcase Screen 4 */}
      <div className="flex items-center justify-between text-slate-700">
        <button
          type="button"
          onClick={() => {
            stopPersistentCamera();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          title="Back"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Center Green Dot Status Pill matching showcase */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{detectedCode ? `Detected: ${detectedCode}` : 'Scanning...'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center transition ${
              torchOn ? 'text-amber-500' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {torchOn ? <Zap className="w-5 h-5 fill-amber-500" /> : <ZapOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isMuted) soundManager.stop();
              setIsMuted(!isMuted);
            }}
            className={`w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center transition ${
              isMuted ? 'text-rose-500' : 'text-blue-600 hover:bg-slate-50'
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Viewfinder matching Showcase Screen 4 (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
            {/* Camera feed */}
            {!activeFrameImage && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Uploaded or Scenario image */}
            {activeFrameImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeFrameImage}
                alt="Target screen"
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Error notice if camera blocked */}
            {cameraError && !activeFrameImage && (
              <div className="p-6 text-center z-10 bg-white rounded-3xl border border-slate-200 max-w-xs shadow-xl space-y-3">
                <Camera className="w-10 h-10 text-blue-600 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Upload Screenshot
                </button>
              </div>
            )}

            {/* White Corner Reticle Brackets matching Showcase Screen 4 */}
            <div className="absolute inset-x-8 inset-y-10 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <span className="w-10 h-10 border-t-[3.5px] border-l-[3.5px] border-white/95 rounded-tl-2xl shadow-sm" />
                <span className="w-10 h-10 border-t-[3.5px] border-r-[3.5px] border-white/95 rounded-tr-2xl shadow-sm" />
              </div>
              <div className="flex justify-between">
                <span className="w-10 h-10 border-b-[3.5px] border-l-[3.5px] border-white/95 rounded-bl-2xl shadow-sm" />
                <span className="w-10 h-10 border-b-[3.5px] border-r-[3.5px] border-white/95 rounded-br-2xl shadow-sm" />
              </div>
            </div>

            {/* Dynamic Bounding Box Overlay if Error Detected */}
            {boundingBox && detectedError && (
              <div
                style={{
                  position: 'absolute',
                  top: `${boundingBox.topPercent}%`,
                  left: `${boundingBox.leftPercent}%`,
                  width: `${boundingBox.widthPercent}%`,
                  height: `${boundingBox.heightPercent}%`,
                }}
                className="border-2 border-rose-500 bg-rose-500/10 rounded-xl pointer-events-none transition-all flex items-start p-1.5 shadow-lg shadow-rose-500/30"
              >
                <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded shadow-sm">
                  {detectedCode || 'ERROR DETECTED'}
                </span>
              </div>
            )}

            {/* Dark Glass Pill Overlay matching Showcase Screen 4 */}
            {/* "Analysing your screen... This will only take a few seconds." */}
            <div className="absolute bottom-20 inset-x-8 z-20 flex justify-center pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10 max-w-sm">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">
                    {detectedError ? detectedError : 'Analysing your screen...'}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {detectedError ? 'Tap shutter to see instructions' : 'This will only take a few seconds.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar matching Showcase Screen 4 */}
            <div className="absolute bottom-4 inset-x-8 z-20 flex items-center justify-between">
              {/* Gallery button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-95 shadow-md"
                title="Upload Photo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Shutter button matching Showcase: double white ring */}
              <button
                type="button"
                disabled={isProcessingFrame}
                onClick={() => processRealFrame(true)}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-[3px] border-white p-1 flex items-center justify-center bg-black/20 backdrop-blur-xs active:scale-95 transition shadow-2xl"
                title="Scan Now"
              >
                <div className="w-full h-full rounded-full bg-white active:bg-sky-200 transition" />
              </button>

              {/* Mic / Audio toggle button */}
              <button
                type="button"
                onClick={() => {
                  if (spokenGuidance) speakVoiceFeedback(spokenGuidance);
                }}
                className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-95 shadow-md"
                title="Voice Guidance"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Test Targets Pill Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Test Targets:
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveFrameImage(null);
                initPersistentCamera();
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                !activeFrameImage
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Live Camera
            </button>

            {REAL_WORLD_SCENARIOS.slice(0, 3).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleLoadScenario(sc)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                  activeFrameImage === sc.imageUrl
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sc.title}
              </button>
            ))}
          </div>
        </div>

        {/* Diagnosis Card (4 cols) */}
        <div className="lg:col-span-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Screen Analysis
          </span>

          {detectedError ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {detectedError}
                </h3>
                {detectedCode && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                    Code: {detectedCode}
                  </span>
                )}
              </div>

              {spokenGuidance && (
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-slate-700 font-medium leading-relaxed">
                  {spokenGuidance}
                </div>
              )}

              <button
                type="button"
                onClick={handleManualCaptureAndProceed}
                className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-blue-500/25"
              >
                <span>See Step-by-Step Fix</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-600">
                Point your camera at the error on your computer screen.
              </p>
              <button
                type="button"
                onClick={() => processRealFrame(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Scan Now
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}

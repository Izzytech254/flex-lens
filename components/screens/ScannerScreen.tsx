'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  ArrowRight,
  Camera,
  Loader2,
  Mic,
  AlertTriangle,
} from 'lucide-react';
import {
  ConfidenceRating,
  DiagnosisReport,
  DiagnosticCause,
  TechnicalCitation,
  TroubleshootingScenario,
  TroubleshootingStep,
} from '@/types/technician';
import { REAL_WORLD_SCENARIOS } from '@/lib/scenarios';
import { soundManager } from '@/lib/sound-feedback';

interface ScannerScreenProps {
  onClose: () => void;
  onAnalyzed: (resultReport: DiagnosisReport, options?: { autoNavigate?: boolean }) => void;
  initialPreset?: 'wifi' | 'printer' | 'update' | null;
  initialImage?: string | null;
}

type BoundingBox = {
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  label?: string;
};

const PRESET_SCENARIO_IDS: Record<'wifi' | 'printer' | 'update', string> = {
  wifi: 'scenario-wifi',
  printer: 'scenario-printer',
  update: 'scenario-windows-update',
};

const LIVE_SCAN_INTERVAL_MS = 8000;
const PROBABILITIES = new Set(['HIGH', 'MEDIUM', 'LOW']);
const ACTION_TYPES = new Set(['gui_action', 'powershell_cmd', 'cmd_command', 'hardware_check', 'reboot_check']);

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validCommand(value: unknown): string | undefined {
  const s = str(value);
  return s && !/^(n\/a|null|none)$/i.test(s) ? s : undefined;
}

function toConfidence(score: number | undefined): ConfidenceRating {
  if (score === undefined) return 'MEDIUM';
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.45) return 'MEDIUM';
  return 'LOW';
}

function parseBoundingBox(raw: any): BoundingBox | null {
  if (!raw || typeof raw !== 'object') return null;
  const nums = ['topPercent', 'leftPercent', 'widthPercent', 'heightPercent'].map((k) => Number(raw[k]));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return {
    topPercent: clamp(nums[0]),
    leftPercent: clamp(nums[1]),
    widthPercent: clamp(nums[2]),
    heightPercent: clamp(nums[3]),
    label: str(raw.label) || undefined,
  };
}

// Converts the model's JSON into a DiagnosisReport using only what the model actually returned.
function buildReport(a: any, id: string, frame: string): DiagnosisReport {
  const title = str(a.detectedError) || 'Detected error';
  const rawCode = str(a.errorCode);
  const code = rawCode && !/^n\/a$/i.test(rawCode) ? rawCode : '';
  const component = str(a.affectedComponent) || 'Windows';
  const score =
    typeof a.confidence === 'number' && Number.isFinite(a.confidence)
      ? Math.min(1, Math.max(0, a.confidence))
      : undefined;

  const symptoms: string[] = Array.isArray(a.observedSymptoms)
    ? a.observedSymptoms.map(str).filter(Boolean)
    : str(a.observedSymptomSummary)
    ? [str(a.observedSymptomSummary)]
    : [];

  const fallbackProbability = (idx: number) => (idx === 0 ? 'HIGH' : idx === 1 ? 'MEDIUM' : 'LOW') as DiagnosticCause['probability'];
  const causes: DiagnosticCause[] = (Array.isArray(a.possibleCauses) ? a.possibleCauses : [])
    .map((c: any, idx: number): DiagnosticCause => {
      if (typeof c === 'string') {
        return {
          title: c,
          probability: fallbackProbability(idx),
          evidence: code ? `Error code ${code}` : 'Visible on screen',
          whyLikely: '',
          isConfirmed: false,
        };
      }
      const prob = str(c?.probability).toUpperCase();
      return {
        title: str(c?.title) || str(c?.cause),
        probability: PROBABILITIES.has(prob) ? (prob as DiagnosticCause['probability']) : fallbackProbability(idx),
        evidence: str(c?.evidence) || (code ? `Error code ${code}` : 'Visible on screen'),
        whyLikely: str(c?.whyLikely),
        isConfirmed: false,
      };
    })
    .filter((c: DiagnosticCause) => c.title);

  let steps: TroubleshootingStep[] = (Array.isArray(a.troubleshootingSteps) ? a.troubleshootingSteps : [])
    .map((st: any, idx: number): TroubleshootingStep => {
      const command = validCommand(st?.command);
      const type = str(st?.actionType);
      const description = str(st?.description);
      return {
        stepNumber: idx + 1,
        title: str(st?.title) || `Step ${idx + 1}`,
        description,
        simpleExplanation: description,
        actionType: (ACTION_TYPES.has(type) ? type : command ? 'powershell_cmd' : 'gui_action') as TroubleshootingStep['actionType'],
        command,
        isAdministratorRequired: Boolean(st?.isAdministratorRequired),
        expectedOutcome: str(st?.expectedOutcome),
        verificationCriteria: str(st?.expectedOutcome),
        safetyCaution: str(st?.safetyCaution) || undefined,
        status: 'pending',
      };
    })
    .filter((st: TroubleshootingStep) => st.title || st.description);

  if (steps.length === 0 && str(a.currentActionInstruction)) {
    steps = [
      {
        stepNumber: 1,
        title: 'Recommended action',
        description: str(a.currentActionInstruction),
        simpleExplanation: str(a.currentActionInstruction),
        actionType: validCommand(a.exactCommand) ? 'powershell_cmd' : 'gui_action',
        command: validCommand(a.exactCommand),
        expectedOutcome: '',
        verificationCriteria: '',
        status: 'pending',
      },
    ];
  }

  const citations: TechnicalCitation[] = (Array.isArray(a.citations) ? a.citations : [])
    .filter((c: any) => /^https:\/\//.test(str(c?.url)))
    .map((c: any): TechnicalCitation => {
      const url = str(c.url);
      return {
        sourceTitle: str(c.sourceTitle) || url,
        authority: url.includes('learn.microsoft.com')
          ? 'Microsoft Learn'
          : url.includes('support.microsoft.com')
          ? 'Microsoft Support'
          : 'Official KB',
        url,
        summary: str(c.summary),
      };
    });

  return {
    id,
    createdAt: new Date().toISOString(),
    problemSummary: title,
    detectedErrorCodes: code ? [code] : [],
    affectedComponent: component,
    systemContext: 'Windows',
    observedSymptoms: symptoms,
    confirmedFacts: code ? [`Error code visible on screen: ${code}`] : [],
    possibleCauses: causes,
    missingInformation: [],
    recommendedTests: [],
    troubleshootingSteps: steps,
    citations,
    confidence: toConfidence(score),
    confidenceScore: score,
    capturedImage: frame,
    mode: 'camera_visual',
  };
}

export default function ScannerScreen({ onClose, onAnalyzed, initialPreset, initialImage }: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const lastSpokenTextRef = useRef<string>('');
  const lastSignatureRef = useRef<string>('');
  const reportIdRef = useRef<string>('');
  const detectedErrorRef = useRef<string | null>(null);
  const affectedComponentRef = useRef<string | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [activeFrameImage, setActiveFrameImage] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [detectedError, setDetectedError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [spokenGuidance, setSpokenGuidance] = useState<string | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
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

  const initPersistentCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable');

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((err) => console.warn(err));
      }
    } catch {
      setCameraActive(false);
      setCameraError('Camera unavailable. Upload a screenshot or pick a test target below.');
    }
  }, []);

  const stopPersistentCamera = useCallback(() => {
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

  const grabVideoFrame = useCallback((): string => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return '';
    const canvas = document.createElement('canvas');
    // Downscale to keep uploads small and fast.
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  /**
   * Analyse a frame.
   * - frame: explicit image (upload/scenario); otherwise the current still image or live video frame.
   * - explicit: user asked for this scan → always report the result and show "no error" feedback.
   * - navigate: open the diagnosis screen when an error is found.
   */
  const processRealFrame = useCallback(
    async (opts: { frame?: string; explicit?: boolean; navigate?: boolean } = {}) => {
      if (isProcessingFrameRef.current) return;
      const frameBase64 = opts.frame || activeFrameImage || grabVideoFrame();
      if (!frameBase64) {
        if (opts.explicit) setErrorMessage('Camera is not ready yet. Try again or upload a screenshot.');
        return;
      }

      isProcessingFrameRef.current = true;
      setIsProcessingFrame(true);
      if (opts.explicit) setErrorMessage(null);

      try {
        const res = await fetch('/api/realtime-solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameBase64,
            sessionContext: {
              detectedError: detectedErrorRef.current,
              affectedComponent: affectedComponentRef.current,
            },
            currentStepNumber: 1,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.analysis) {
          throw new Error(data.error || 'Analysis failed. Please try again.');
        }

        const a = data.analysis;
        const hasError = a.screenState === 'ERROR_ACTIVE' || (str(a.detectedError) && a.screenState !== 'NO_ERROR_DETECTED');

        if (hasError) {
          const title = str(a.detectedError) || 'Detected error';
          const code = str(a.errorCode);
          const signature = `${title}|${code}`.toLowerCase();
          const isNewProblem = signature !== lastSignatureRef.current;
          if (isNewProblem) {
            lastSignatureRef.current = signature;
            reportIdRef.current = 'fl_' + Date.now().toString(36);
          }

          const report = buildReport(a, reportIdRef.current, frameBase64);
          const voiceText =
            str(a.realtimeSpokenGuidance) ||
            `Detected ${title}. ${str(a.currentActionInstruction) || 'Follow the steps to fix it.'}`;

          detectedErrorRef.current = report.problemSummary;
          affectedComponentRef.current = report.affectedComponent;
          setDetectedError(report.problemSummary);
          setDetectedCode(report.detectedErrorCodes[0] || null);
          setSpokenGuidance(voiceText);
          setBoundingBox(parseBoundingBox(a.boundingBoxHint));
          setLatestReport(report);
          setErrorMessage(null);

          if (voiceText !== lastSpokenTextRef.current) {
            lastSpokenTextRef.current = voiceText;
            speakVoiceFeedback(voiceText);
          }

          // Only save/notify when something new was found or the user explicitly scanned.
          if (isNewProblem || opts.explicit || opts.navigate) {
            onAnalyzed(report, { autoNavigate: !!opts.navigate });
          }
        } else {
          setBoundingBox(null);
          if (opts.explicit) {
            setErrorMessage(
              str(a.observedSymptomSummary)
                ? `No error detected: ${str(a.observedSymptomSummary)}`
                : 'No error detected. Move closer so the error message fills the frame.'
            );
          }
        }
      } catch (err: any) {
        if (opts.explicit || opts.frame) setErrorMessage(err?.message || 'Analysis failed. Please try again.');
      } finally {
        isProcessingFrameRef.current = false;
        setIsProcessingFrame(false);
      }
    },
    [activeFrameImage, grabVideoFrame, speakVoiceFeedback, onAnalyzed]
  );

  // Continuous scanning only while the live camera is showing and the tab is visible.
  useEffect(() => {
    if (!cameraActive || activeFrameImage) return;
    const initialTimer = setTimeout(() => processRealFrame(), 1500);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') processRealFrame();
    }, LIVE_SCAN_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [cameraActive, activeFrameImage, processRealFrame]);

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
      const w = img.naturalWidth || 1280;
      const h = img.naturalHeight || 800;
      const scale = Math.min(1, 1600 / w);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onReady(canvas.toDataURL('image/jpeg', 0.92));
      } else {
        onReady(rawUrl);
      }
    };
    img.onerror = () => onReady(rawUrl);
    img.src = rawUrl;
  }, []);

  const loadStillImage = useCallback(
    (rawUrl: string, scenarioId: string | null) => {
      rasterizeToJpeg(rawUrl, (jpegUrl) => {
        setActiveFrameImage(jpegUrl);
        setActiveScenarioId(scenarioId);
        setDetectedError(null);
        setDetectedCode(null);
        setBoundingBox(null);
        setLatestReport(null);
        lastSpokenTextRef.current = '';
        lastSignatureRef.current = '';
        detectedErrorRef.current = null;
        affectedComponentRef.current = null;
        processRealFrame({ frame: jpegUrl, explicit: true });
      });
    },
    [rasterizeToJpeg, processRealFrame]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => loadStillImage(event.target?.result as string, null);
    reader.readAsDataURL(file);
  };

  const handleLoadScenario = useCallback(
    (sc: TroubleshootingScenario) => loadStillImage(sc.imageUrl, sc.id),
    [loadStillImage]
  );

  // Run once on mount for an uploaded image or a quick-help preset.
  const initialHandledRef = useRef(false);
  useEffect(() => {
    if (initialHandledRef.current) return;
    if (initialImage) {
      const timer = setTimeout(() => {
        initialHandledRef.current = true;
        loadStillImage(initialImage, null);
      }, 200);
      return () => clearTimeout(timer);
    }
    if (initialPreset) {
      const found = REAL_WORLD_SCENARIOS.find((s) => s.id === PRESET_SCENARIO_IDS[initialPreset]);
      if (found) {
        const timer = setTimeout(() => {
          initialHandledRef.current = true;
          handleLoadScenario(found);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [initialImage, initialPreset, loadStillImage, handleLoadScenario]);

  const handleSeeFix = () => {
    if (latestReport) {
      stopPersistentCamera();
      onAnalyzed(latestReport, { autoNavigate: true });
    } else {
      processRealFrame({ explicit: true, navigate: true });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 select-none animate-fadeIn space-y-4">
      <div className="flex items-center justify-between text-slate-700">
        <button
          type="button"
          onClick={() => {
            stopPersistentCamera();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold shadow-md"
          role="status"
          aria-live="polite"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${detectedCode || detectedError ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`}
          />
          <span>
            {isProcessingFrame
              ? 'Analysing…'
              : detectedError
              ? `Detected${detectedCode ? `: ${detectedCode}` : ''}`
              : cameraActive && !activeFrameImage
              ? 'Scanning…'
              : 'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle flashlight"
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
            aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
            className={`w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center transition ${
              isMuted ? 'text-rose-500' : 'text-blue-600 hover:bg-slate-50'
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-3">
          <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
            {!activeFrameImage && (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}

            {activeFrameImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeFrameImage} alt="Screen being analysed" className="w-full h-full object-contain bg-black" />
            )}

            {cameraError && !activeFrameImage && (
              <div className="absolute p-6 text-center z-10 bg-white rounded-3xl border border-slate-200 max-w-xs shadow-xl space-y-3">
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

            {(isProcessingFrame || detectedError) && (
              <div className="absolute bottom-20 inset-x-8 z-20 flex justify-center pointer-events-none">
                <div className="bg-slate-900/85 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10 max-w-sm">
                  {isProcessingFrame && <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />}
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {isProcessingFrame ? 'Analysing your screen...' : detectedError}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {isProcessingFrame ? 'This will only take a few seconds.' : 'Tap “See Step-by-Step Fix”'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 inset-x-8 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-95 shadow-md"
                aria-label="Upload screenshot"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <button
                type="button"
                disabled={isProcessingFrame}
                onClick={() => processRealFrame({ explicit: true })}
                className="w-16 h-16 rounded-full border-[3px] border-white p-1 flex items-center justify-center bg-black/20 backdrop-blur-xs active:scale-95 transition shadow-2xl disabled:opacity-60"
                aria-label="Scan now"
              >
                <div className="w-full h-full rounded-full bg-white active:bg-sky-200 transition" />
              </button>

              <button
                type="button"
                disabled={!spokenGuidance}
                onClick={() => {
                  if (spokenGuidance) speakVoiceFeedback(spokenGuidance);
                }}
                className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition active:scale-95 shadow-md disabled:opacity-50"
                aria-label="Repeat voice guidance"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Test Targets:
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveFrameImage(null);
                setActiveScenarioId(null);
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

            {REAL_WORLD_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleLoadScenario(sc)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                  activeScenarioId === sc.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sc.title}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Screen Analysis
          </span>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {detectedError ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-snug">{detectedError}</h3>
                {detectedCode && (
                  <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">Code: {detectedCode}</span>
                )}
              </div>

              {spokenGuidance && (
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-slate-700 font-medium leading-relaxed">
                  {spokenGuidance}
                </div>
              )}

              <button
                type="button"
                onClick={handleSeeFix}
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
                Point your camera at the error on your computer screen, or upload a screenshot.
              </p>
              <button
                type="button"
                disabled={isProcessingFrame}
                onClick={() => processRealFrame({ explicit: true, navigate: true })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
              >
                {isProcessingFrame ? 'Analysing…' : 'Scan Now'}
              </button>
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </div>
  );
}

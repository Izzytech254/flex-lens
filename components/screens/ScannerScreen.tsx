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
  ArrowLeft,
  Camera,
  Loader2,
  Mic,
  MicOff,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle2,
  Eye,
  RotateCcw,
  Send,
  FileText,
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
import { useHandsFree, VoiceCommand } from '@/lib/use-hands-free';

interface ScannerScreenProps {
  onClose: () => void;
  /** Called when a problem is detected (saved to history). autoNavigate opens the full diagnosis screen. */
  onAnalyzed: (resultReport: DiagnosisReport, options?: { autoNavigate?: boolean }) => void;
  /** Called when the user confirms the problem is fixed. */
  onResolved: (report: DiagnosisReport) => void;
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

// Live camera pacing: check for screen changes often, but only call the AI when something changed
// (or after an idle timeout), and never more than once per MIN_SCAN_GAP_MS.
const TICK_MS = 1500;
const MIN_SCAN_GAP_MS = 2500;
const IDLE_RESCAN_DETECT_MS = 15000;
const IDLE_RESCAN_GUIDE_MS = 10000;
const CHANGE_THRESHOLD = 8; // mean per-channel difference on a 32x18 thumbnail
// Guided-fix pacing: give the user time to hear and do each step before the camera may move on,
// and require the AI to agree twice in a row (one frame can easily be misjudged).
const MIN_STEP_DWELL_MS = 12000;
const CONFIRMATIONS_NEEDED = 2;

const PROBABILITIES = new Set(['HIGH', 'MEDIUM', 'LOW']);
const ACTION_TYPES = new Set(['gui_action', 'powershell_cmd', 'cmd_command', 'terminal_cmd', 'hardware_check', 'reboot_check']);

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function validCommand(value: unknown): string | undefined {
  const s = str(value);
  return s && !/^(n\/a|null|none)$/i.test(s) ? s : undefined;
}

function defaultCommandType(os: string): TroubleshootingStep['actionType'] {
  return /mac|linux|ubuntu|debian|fedora|arch/i.test(os) ? 'terminal_cmd' : 'powershell_cmd';
}

function commandLabel(step: TroubleshootingStep): string {
  if (step.actionType === 'cmd_command') return 'Command Prompt';
  if (step.actionType === 'terminal_cmd') return 'Terminal';
  return 'PowerShell';
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
  if (nums[2] <= 0 || nums[3] <= 0) return null;
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
  const rawOs = str(a.detectedOS);
  const os = rawOs && !/^unknown$/i.test(rawOs) ? rawOs : '';
  const component = str(a.affectedComponent) || 'Unknown component';
  const score =
    typeof a.confidence === 'number' && Number.isFinite(a.confidence)
      ? Math.min(1, Math.max(0, a.confidence))
      : undefined;

  const symptoms: string[] = Array.isArray(a.observedSymptoms)
    ? a.observedSymptoms.map(str).filter(Boolean)
    : str(a.observedSymptomSummary)
    ? [str(a.observedSymptomSummary)]
    : [];

  const fallbackProbability = (idx: number) =>
    (idx === 0 ? 'HIGH' : idx === 1 ? 'MEDIUM' : 'LOW') as DiagnosticCause['probability'];
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
        spokenInstruction: str(st?.spokenInstruction) || undefined,
        actionType: (ACTION_TYPES.has(type) ? type : command ? defaultCommandType(os) : 'gui_action') as TroubleshootingStep['actionType'],
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
        actionType: validCommand(a.exactCommand) ? defaultCommandType(os) : 'gui_action',
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
    systemContext: os || 'Unknown OS',
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

/** Turns a written instruction into short spoken beats ("Open X, then click Y" → "Open X. ... Click Y."). */
function toSpokenBeats(text: string): string {
  return text
    .replace(/\s*[,;]?\s*(?:and then|then|after that|next)\s+/gi, '. ... ')
    .replace(/\s*;\s*/g, '. ... ')
    .replace(/\.\s*\.\s*\.\s*\.+/g, '. ...')
    .trim();
}

/** Voice-style narration of a step: natural connector, one action per beat, then ask them to report back. */
function stepNarration(report: DiagnosisReport, idx: number): string {
  const steps = report.troubleshootingSteps;
  const st = steps[idx];
  if (!st) return '';
  const first = idx === 0;
  const last = idx === steps.length - 1 && steps.length > 1;

  const lead = first ? 'Ok so, first thing.' : last ? 'Alright, last thing.' : 'Alright, next thing.';
  const body = st.spokenInstruction || toSpokenBeats(st.description || st.title);
  const beats = [lead, body];

  if (st.command) beats.push(`I've put the command on your screen. ... Just copy it into ${commandLabel(st)}.`);
  if (st.isAdministratorRequired) {
    beats.push(
      st.actionType === 'terminal_cmd'
        ? "Heads up — that one needs sudo. That's admin access."
        : "Heads up — you'll need to open it as administrator."
    );
  }
  if (st.safetyCaution) beats.push(`One thing to watch out for. ... ${st.safetyCaution}`);
  if (!/\?\s*$/.test(body)) beats.push(last ? "Let me know when that's done." : "Tell me when you've done that.");

  return beats.join(' ... ');
}

export default function ScannerScreen({ onClose, onAnalyzed, onResolved, initialPreset, initialImage }: ScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const thumbAtLastScanRef = useRef<Uint8ClampedArray | null>(null);
  const lastScanAtRef = useRef(0);
  const isProcessingFrameRef = useRef<boolean>(false);
  const lastSpokenTextRef = useRef<string>('');
  const lastSignatureRef = useRef<string>('');
  const reportIdRef = useRef<string>('');
  const speakingRef = useRef(false);
  const isMutedRef = useRef(false);

  // Every scan is tagged with the current "epoch". Moving to another step, confirming the fix,
  // resetting or leaving the scanner bumps the epoch, so late responses are ignored instead of
  // being spoken about a screen that has already moved on.
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const bumpEpoch = () => {
    epochRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
  };

  // Guided-fix state (refs mirror state so callbacks stay stable)
  const reportRef = useRef<DiagnosisReport | null>(null);
  const guideIdxRef = useRef<number | null>(null);
  const fixedCandidateRef = useRef(false);
  const liveTipRef = useRef('');
  const convoRef = useRef<Array<{ sender: 'user' | 'bot'; text: string }>>([]);
  // When the current step started, and how many consecutive camera checks agreed it's done / resolved.
  const stepStartedAtRef = useRef(0);
  const stepStartThumbRef = useRef<Uint8ClampedArray | null>(null);
  const doneVotesRef = useRef(0);
  const resolvedVotesRef = useRef(0);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [showExamples, setShowExamples] = useState<boolean>(false);
  const [activeFrameImage, setActiveFrameImage] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  // True while the full step-by-step plan is being generated after the fast first look.
  const [planning, setPlanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [detectedError, setDetectedError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [spokenGuidance, setSpokenGuidance] = useState<string | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [latestReport, setLatestReport] = useState<DiagnosisReport | null>(null);

  const [guideIdx, setGuideIdxState] = useState<number | null>(null);
  const [liveTip, setLiveTip] = useState<string | null>(null);
  const [fixedCandidate, setFixedCandidateState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [question, setQuestion] = useState('');
  const [exchange, setExchange] = useState<{ heard: string; reply: string | null } | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => soundManager.subscribeSpeaking((s) => (speakingRef.current = s)), []);

  // On leaving the scanner: ignore/cancel anything in flight and stop talking.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      epochRef.current++;
      abortRef.current?.abort();
      soundManager.stop();
    };
  }, []);

  const setGuideIdx = (idx: number | null) => {
    guideIdxRef.current = idx;
    setGuideIdxState(idx);
  };
  const setFixedCandidate = (v: boolean) => {
    fixedCandidateRef.current = v;
    setFixedCandidateState(v);
  };

  /**
   * Speak text. interrupt=false is for live tips: skipped if FixLens is already talking, and
   * dropped if it can't start within a few seconds (so it never talks about an old screen).
   */
  const say = useCallback((text: string, mode: boolean | 'queue' = true) => {
    if (!mountedRef.current || isMutedRef.current || !text) return;
    lastSpokenTextRef.current = text;
    // 'queue': speak right after whatever FixLens is currently saying (never cut it off).
    if (mode === 'queue') {
      soundManager.speakNext(text);
      return;
    }
    const interrupt = mode;
    if (!interrupt && (speakingRef.current || soundManager.isBusy())) return;
    soundManager.speak(text, interrupt ? undefined : { expireMs: 3500 });
  }, []);

  // ---------------------------------------------------------------- camera

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
      thumbAtLastScanRef.current = null;
      setCameraActive(true);
      try {
        const track = mediaStream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities ? track.getCapabilities() : {};
        setTorchSupported(!!caps && 'torch' in caps);
      } catch {
        setTorchSupported(false);
      }

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

  const grabVideoFrame = useCallback((maxWidth: number): string => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return '';
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', maxWidth > 1200 ? 0.85 : 0.75);
  }, []);

  /** Tiny thumbnail of the current video frame, used to detect whether the screen changed. */
  const captureThumb = useCallback((): Uint8ClampedArray | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    if (!thumbCanvasRef.current) {
      thumbCanvasRef.current = document.createElement('canvas');
      thumbCanvasRef.current.width = 32;
      thumbCanvasRef.current.height = 18;
    }
    const ctx = thumbCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 32, 18);
    return ctx.getImageData(0, 0, 32, 18).data;
  }, []);

  /** True if the live view differs noticeably from `baseline` (a thumbnail taken earlier). */
  const screenChangedSince = useCallback(
    (baseline: Uint8ClampedArray | null, threshold = CHANGE_THRESHOLD): boolean => {
      const now = captureThumb();
      if (!now) return false;
      if (!baseline || baseline.length !== now.length) return true;
      let diff = 0;
      for (let i = 0; i < now.length; i += 4) {
        diff +=
          Math.abs(now[i] - baseline[i]) + Math.abs(now[i + 1] - baseline[i + 1]) + Math.abs(now[i + 2] - baseline[i + 2]);
      }
      return diff / ((now.length / 4) * 3) > threshold;
    },
    [captureThumb]
  );

  const screenChangedSinceLastScan = useCallback(
    (): boolean => screenChangedSince(thumbAtLastScanRef.current),
    [screenChangedSince]
  );

  // ---------------------------------------------------------------- guided fix

  const goToStep = useCallback(
    (idx: number, prefix = '', queue = false) => {
      const report = reportRef.current;
      if (!report) return;
      bumpEpoch(); // results about the previous step are now irrelevant
      stepStartedAtRef.current = Date.now();
      stepStartThumbRef.current = captureThumb(); // what the screen looked like when this step began
      doneVotesRef.current = 0;
      resolvedVotesRef.current = 0;
      setGuideIdx(idx);
      setCopied(false);
      liveTipRef.current = '';
      setLiveTip(null);
      say(`${prefix}${prefix ? ' ' : ''}${stepNarration(report, idx)}`, queue ? 'queue' : true);
    },
    [say, captureThumb]
  );

  /** Starts guiding through the report's steps. queue=true waits for FixLens's current sentence to finish. */
  const startGuide = useCallback(
    (report: DiagnosisReport, intro: string, queue = false) => {
      reportRef.current = report;
      setFixedCandidate(false);
      convoRef.current = [];
      setExchange(null);
      if (report.troubleshootingSteps.length === 0) {
        setGuideIdx(null);
        say(intro, queue ? 'queue' : true);
        return;
      }
      soundManager.playSoundEffect('step');
      goToStep(0, intro, queue);
    },
    [goToStep, say]
  );

  const advance = useCallback(() => {
    const report = reportRef.current;
    const idx = guideIdxRef.current;
    if (!report || idx === null) return;
    soundManager.playSoundEffect('step');
    if (idx < report.troubleshootingSteps.length - 1) {
      goToStep(idx + 1);
    } else {
      bumpEpoch();
      setFixedCandidate(true);
      say("Alright, that was the last step. ... So— is it working now?");
    }
  }, [goToStep, say]);

  const back = useCallback(() => {
    const idx = guideIdxRef.current;
    if (idx !== null && idx > 0) goToStep(idx - 1);
  }, [goToStep]);

  const repeat = useCallback(() => {
    const report = reportRef.current;
    const idx = guideIdxRef.current;
    if (report && idx !== null) say(stepNarration(report, idx));
    else if (lastSpokenTextRef.current) say(lastSpokenTextRef.current);
  }, [say]);

  const confirmFixed = useCallback(() => {
    const report = reportRef.current;
    if (!report) return;
    bumpEpoch();
    // Just a success chime: we're leaving the scanner, so don't start a sentence that gets cut off.
    stopPersistentCamera();
    soundManager.playSoundEffect('success');
    onResolved({ ...report, resolved: true });
  }, [say, stopPersistentCamera, onResolved]);

  const notFixedYet = useCallback(() => {
    bumpEpoch();
    setFixedCandidate(false);
    setGuideIdx(null);
    reportRef.current = null;
    lastSignatureRef.current = '';
    thumbAtLastScanRef.current = null;
    setDetectedError(null);
    setDetectedCode(null);
    setLatestReport(null);
    setLiveTip(null);
    say("Ok, no worries. ... Point me at the screen again and I'll take another look.");
  }, [say]);

  const askQuestion = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q) return;
      setExchange({ heard: q, reply: null });
      try {
        const report = reportRef.current;
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            report: report ? { ...report, capturedImage: undefined } : null,
            activeStepIndex: guideIdxRef.current ?? 0,
            history: convoRef.current.slice(-10),
          }),
        });
        const data = await res.json().catch(() => ({}));
        const reply: string = data.success && data.reply ? data.reply : data.error || 'Sorry, I could not answer that.';
        convoRef.current = [...convoRef.current, { sender: 'user' as const, text: q }, { sender: 'bot' as const, text: reply }].slice(-10);
        setExchange({ heard: q, reply });
        say(reply);
      } catch {
        setExchange({ heard: q, reply: "I can't reach the FixLens server right now." });
      }
    },
    [say]
  );

  const handsFree = useHandsFree({
    onCommand: (cmd: VoiceCommand) => {
      if (cmd === 'stop') soundManager.stop();
      else if (cmd === 'repeat') repeat();
      else if (cmd === 'back') back();
      else if (cmd === 'next') {
        if (fixedCandidateRef.current) return;
        advance();
      } else if (cmd === 'fixed' && reportRef.current) confirmFixed();
    },
    onQuestion: (t) => askQuestion(t),
  });

  // ---------------------------------------------------------------- analysis

  /** stale=true when the screen has changed since the frame was captured: progress still counts, tips don't. */
  const handleProgress = useCallback(
    (p: any, stale: boolean) => {
      const progress = str(p?.stepProgress).toUpperCase();
      const conf = num(p?.confidence, 0.5);
      if (!stale) setBoundingBox(parseBoundingBox(p?.boundingBoxHint));

      // Too early in this step (the user is probably still listening / starting): don't move on yet.
      const settled = Date.now() - stepStartedAtRef.current >= MIN_STEP_DWELL_MS;

      // Count consecutive agreeing checks; any other verdict resets the count.
      resolvedVotesRef.current = progress === 'RESOLVED' && conf >= 0.7 ? resolvedVotesRef.current + 1 : 0;
      doneVotesRef.current = progress === 'STEP_DONE' && conf >= 0.7 ? doneVotesRef.current + 1 : 0;

      if (progress === 'RESOLVED' && conf >= 0.7) {
        if (!settled || resolvedVotesRef.current < CONFIRMATIONS_NEEDED) return;
        if (!fixedCandidateRef.current) {
          bumpEpoch();
          setFixedCandidate(true);
          soundManager.playSoundEffect('success');
          say("Oh nice — looks like that error's gone. ... Is everything working now?");
        }
        return;
      }
      if (progress === 'STEP_DONE' && conf >= 0.7) {
        if (!settled || doneVotesRef.current < CONFIRMATIONS_NEEDED) return;
        // The user must actually have done something: the screen has to look different from when
        // this step started. A static error screen can never auto-advance.
        if (!screenChangedSince(stepStartThumbRef.current)) {
          doneVotesRef.current = 0;
          return;
        }
        doneVotesRef.current = 0;
        const report = reportRef.current;
        const idx = guideIdxRef.current;
        if (report && idx !== null) {
          if (idx < report.troubleshootingSteps.length - 1) {
            soundManager.playSoundEffect('step');
            goToStep(idx + 1, 'Nice, that looks done.');
          } else if (!fixedCandidateRef.current) {
            advance();
          }
        }
        return;
      }
      // Anything below describes what's on screen *right now* — skip it if the screen has moved on.
      if (stale) return;

      if (progress === 'NEW_ERROR' && str(p?.newErrorText)) {
        const text = `A different error popped up: ${str(p.newErrorText)}`;
        liveTipRef.current = text;
        setLiveTip(text);
        say(
          `Hmm, hang on— a different error just popped up. ... It says: ${str(p.newErrorText)}. ... Tap scan if you want me to look at that one instead.`
        );
        return;
      }
      const tip = str(p?.liveGuidance);
      if (tip && tip !== liveTipRef.current) {
        liveTipRef.current = tip;
        setLiveTip(tip);
        say(tip, false);
      }
    },
    [say, goToStep, advance, screenChangedSince]
  );

  /**
   * Analyse a frame.
   * - frame: explicit image (upload/scenario); otherwise the current still image or live video frame.
   * - explicit: the user asked for this scan → thorough model and visible feedback.
   */
  const processRealFrame = useCallback(
    async (opts: { frame?: string; explicit?: boolean } = {}) => {
      if (isProcessingFrameRef.current) return;
      const frameBase64 = opts.frame || activeFrameImage || grabVideoFrame(opts.explicit ? 1600 : 1024);
      if (!frameBase64) {
        if (opts.explicit) setErrorMessage('Camera is not ready yet. Try again or upload a screenshot.');
        return;
      }

      isProcessingFrameRef.current = true;
      lastScanAtRef.current = Date.now();
      const thumbAtCapture = captureThumb();
      thumbAtLastScanRef.current = thumbAtCapture;
      setIsProcessingFrame(true);
      if (opts.explicit) setErrorMessage(null);

      const report = reportRef.current;
      const idx = guideIdxRef.current;
      const guiding = !!report && idx !== null && !opts.explicit;
      const epoch = epochRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      const isCurrent = () => mountedRef.current && epoch === epochRef.current;
      let announced = false; // FixLens already said "give me a second…" for this scan

      try {
        const step = guiding ? report!.troubleshootingSteps[idx!] : undefined;
        const res = await fetch('/api/realtime-solve', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameBase64,
            // Not guiding yet: a fast first look so FixLens can start talking right away.
            mode: guiding ? 'quick' : 'detect',
            sessionContext: report
              ? { detectedError: report.problemSummary, affectedComponent: report.affectedComponent }
              : {},
            guide: guiding
              ? {
                  problem: report!.problemSummary,
                  os: report!.systemContext,
                  stepNumber: idx! + 1,
                  totalSteps: report!.troubleshootingSteps.length,
                  stepTitle: step?.title,
                  stepInstruction: step?.description,
                  expectedOutcome: step?.expectedOutcome,
                  lastTip: liveTipRef.current,
                }
              : undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!isCurrent()) return; // user moved on (new step, fixed, reset or left) — ignore this result
        if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed. Please try again.');

        if (guiding) {
          // Live camera only: if the screen changed a lot while we waited, the tip is out of date.
          const stale = !activeFrameImage && screenChangedSince(thumbAtCapture, CHANGE_THRESHOLD * 1.5);
          if (data.progress) handleProgress(data.progress, stale);
          return;
        }

        const a = data.analysis;
        if (!a) throw new Error('Analysis failed. Please try again.');
        const isUnclear = a.screenState === 'UNCLEAR';
        const hasError =
          !isUnclear &&
          (a.screenState === 'ERROR_ACTIVE' || (str(a.detectedError) && a.screenState !== 'NO_ERROR_DETECTED'));

        if (isUnclear) {
          setBoundingBox(null);
          const ask =
            str(a.realtimeSpokenGuidance) ||
            "I can't quite read that. Could you move closer to the error, or upload a screenshot?";
          setErrorMessage(ask);
          if (ask !== lastSpokenTextRef.current) say(ask, !!(opts.explicit || opts.frame));
        } else if (hasError) {
          const title = str(a.detectedError) || 'Detected error';
          const code = str(a.errorCode);
          const signature = `${title}|${code}`.toLowerCase();
          const isNewProblem = signature !== lastSignatureRef.current;
          if (isNewProblem) {
            lastSignatureRef.current = signature;
            reportIdRef.current = 'fl_' + Date.now().toString(36);
          }

          setBoundingBox(parseBoundingBox(a.boundingBoxHint));
          if (!isNewProblem && !opts.explicit) return; // already handling this exact problem

          // ---- Stage 1: say what we see immediately ----
          const firstLook = buildReport(a, reportIdRef.current, frameBase64);
          setDetectedError(firstLook.problemSummary);
          setDetectedCode(firstLook.detectedErrorCodes[0] || null);
          setSpokenGuidance(str(a.realtimeSpokenGuidance) || null);
          setLatestReport(firstLook);
          setErrorMessage(null);

          const explanation = str(a.realtimeSpokenGuidance);
          const opening = explanation
            ? `Ok, here's what's happening. ... ${explanation}`
            : `Ok, I can see the problem. ... ${firstLook.problemSummary}.`;

          if (!data.detection && firstLook.troubleshootingSteps.length > 0) {
            // Server already returned the full plan (older response shape): guide straight away.
            onAnalyzed(firstLook, { autoNavigate: false });
            startGuide(firstLook, `${opening} ... Let's fix it together.`);
            return;
          }

          soundManager.playSoundEffect('detect');
          say(`${opening} ... Give me a second while I work out the fix.`);
          announced = true;

          // ---- Stage 2: get the full step-by-step plan while that sentence plays ----
          setPlanning(true);
          const fullRes = await fetch('/api/realtime-solve', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frameBase64,
              mode: 'full',
              sessionContext: { detectedError: firstLook.problemSummary, affectedComponent: firstLook.affectedComponent },
            }),
          });
          const full = await fullRes.json().catch(() => ({}));
          if (!isCurrent()) return;
          if (!fullRes.ok || !full.success || !full.analysis) {
            throw new Error(full.error || "I couldn't work out the fix steps. Tap Scan to try again.");
          }

          const f = full.analysis;
          const merged = {
            ...a,
            ...f,
            detectedError: str(f.detectedError) || a.detectedError,
            errorCode: str(f.errorCode) && !/^n\/a$/i.test(str(f.errorCode)) ? f.errorCode : a.errorCode,
            detectedOS: str(f.detectedOS) || a.detectedOS,
          };
          const newReport = buildReport(merged, reportIdRef.current, frameBase64);
          setLatestReport(newReport);
          setDetectedError(newReport.problemSummary);
          setDetectedCode(newReport.detectedErrorCodes[0] || null);
          setPlanning(false);
          onAnalyzed(newReport, { autoNavigate: false });
          // Starts right after the opening sentence finishes — never cuts it off.
          startGuide(newReport, "Alright, here's how we fix it.", true);
        } else {
          setBoundingBox(null);
          if (opts.explicit || opts.frame) {
            setErrorMessage(
              str(a.observedSymptomSummary)
                ? `No error detected: ${str(a.observedSymptomSummary)}`
                : 'No error detected. Move closer so the error message fills the frame.'
            );
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || !isCurrent()) return;
        if (announced) {
          // We promised a fix — don't leave the user waiting in silence.
          setErrorMessage(err?.message || "I couldn't work out the fix steps. Tap Scan to try again.");
          say("Sorry, I couldn't work out the steps that time. ... Tap scan and I'll try again.", 'queue');
        } else if (opts.explicit || opts.frame) {
          const unreachable = err instanceof TypeError;
          setErrorMessage(
            unreachable
              ? "Can't reach the FixLens server. Check your connection and try again."
              : err?.message || 'Analysis failed. Please try again.'
          );
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        isProcessingFrameRef.current = false;
        if (mountedRef.current) {
          setIsProcessingFrame(false);
          setPlanning(false);
        }
      }
    },
    [activeFrameImage, grabVideoFrame, captureThumb, screenChangedSince, handleProgress, onAnalyzed, startGuide, say]
  );

  // Live camera loop: scan when the screen changes (or after an idle timeout).
  useEffect(() => {
    if (!cameraActive || activeFrameImage) return;
    const first = setTimeout(() => processRealFrame(), 600);
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (isProcessingFrameRef.current || fixedCandidateRef.current) return;
      // While guiding, never check the screen while FixLens is talking (or loading its voice):
      // a result arriving mid-sentence would cut the instruction off.
      if (guideIdxRef.current !== null && (speakingRef.current || soundManager.isBusy())) return;
      const since = Date.now() - lastScanAtRef.current;
      if (since < MIN_SCAN_GAP_MS) return;
      const idle = guideIdxRef.current !== null ? IDLE_RESCAN_GUIDE_MS : IDLE_RESCAN_DETECT_MS;
      if (screenChangedSinceLastScan() || since > idle) processRealFrame();
    }, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [cameraActive, activeFrameImage, processRealFrame, screenChangedSinceLastScan]);

  useEffect(() => {
    const t = setTimeout(() => initPersistentCamera(), 10);
    return () => {
      clearTimeout(t);
      stopPersistentCamera();
    };
  }, [initPersistentCamera, stopPersistentCamera]);

  // ---------------------------------------------------------------- still images

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

  const resetDetection = () => {
    bumpEpoch();
    soundManager.stop();
    setDetectedError(null);
    setDetectedCode(null);
    setBoundingBox(null);
    setLatestReport(null);
    setSpokenGuidance(null);
    setLiveTip(null);
    setFixedCandidate(false);
    setGuideIdx(null);
    reportRef.current = null;
    lastSpokenTextRef.current = '';
    lastSignatureRef.current = '';
    liveTipRef.current = '';
  };

  const loadStillImage = useCallback(
    (rawUrl: string, scenarioId: string | null) => {
      rasterizeToJpeg(rawUrl, (jpegUrl) => {
        setActiveFrameImage(jpegUrl);
        setActiveScenarioId(scenarioId);
        resetDetection();
        processRealFrame({ frame: jpegUrl, explicit: true });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // ---------------------------------------------------------------- render

  const guiding = guideIdx !== null && latestReport !== null && latestReport.troubleshootingSteps.length > 0;
  const steps = latestReport?.troubleshootingSteps || [];
  const currentStep = guiding ? steps[Math.min(guideIdx!, steps.length - 1)] : undefined;
  const watching = cameraActive && !activeFrameImage;

  const statusText = isProcessingFrame && !guiding
    ? 'Analysing…'
    : guiding
    ? `Step ${guideIdx! + 1}/${steps.length}${watching ? ' · watching' : ''}`
    : detectedError
    ? `Detected${detectedCode ? `: ${detectedCode}` : ''}`
    : watching
    ? 'Scanning…'
    : 'Ready';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 select-none animate-fadeIn space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-ink">
        <button
          type="button"
          onClick={() => {
            stopPersistentCamera();
            onClose();
          }}
          className="h-9 w-9 rounded-lg bg-white border border-hairline flex items-center justify-center text-ink hover:bg-paper transition"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="eyebrow text-accent-700 hidden sm:inline mr-auto ml-4">01 / Scan</span>

        <div
          className="flex items-center gap-2 h-8 px-3 rounded-full bg-white border border-hairline text-ink text-xs font-medium"
          role="status"
          aria-live="polite"
        >
          <span
            className={`w-2 h-2 rounded-full ${detectedError && !guiding ? 'bg-rose-500' : 'bg-emerald-500'} ${
              watching || isProcessingFrame ? 'animate-pulse' : ''
            }`}
          />
          <span>{statusText}</span>
        </div>

        <div className="flex items-center gap-2">
          {torchSupported && watching && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
              className={`h-9 w-9 rounded-lg bg-white border border-hairline flex items-center justify-center transition ${
                torchOn ? 'text-amber-500' : 'text-ink-soft hover:bg-paper'
              }`}
            >
              {torchOn ? <Zap className="w-5 h-5 fill-amber-500" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!isMuted) soundManager.stop();
              setIsMuted(!isMuted);
            }}
            aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
            className={`h-9 w-9 rounded-lg bg-white border border-hairline flex items-center justify-center transition ${
              isMuted ? 'text-rose-500' : 'text-accent-600 hover:bg-paper'
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Viewfinder */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-xl overflow-hidden border border-slate-900 flex items-center justify-center">
            {!activeFrameImage && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}

            {activeFrameImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeFrameImage} alt="Screen being analysed" className="w-full h-full object-contain bg-black" />
            )}

            {cameraError && !activeFrameImage && (
              <div className="absolute p-6 text-center z-10 bg-white rounded-xl border border-hairline max-w-xs shadow-xl space-y-3">
                <Camera className="w-10 h-10 text-accent-600 mx-auto" />
                <p className="text-xs text-ink-soft font-medium">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-ink text-white rounded-lg text-xs font-medium shadow-sm"
                >
                  Upload Screenshot
                </button>
              </div>
            )}

            <div className="absolute inset-x-8 inset-y-10 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <span className="w-10 h-10 border-t-2 border-l-2 border-white/95 rounded-tl-2xl shadow-sm" />
                <span className="w-10 h-10 border-t-2 border-r-2 border-white/95 rounded-tr-2xl shadow-sm" />
              </div>
              <div className="flex justify-between">
                <span className="w-10 h-10 border-b-2 border-l-2 border-white/95 rounded-bl-2xl shadow-sm" />
                <span className="w-10 h-10 border-b-2 border-r-2 border-white/95 rounded-br-2xl shadow-sm" />
              </div>
            </div>

            {boundingBox && (detectedError || guiding) && (
              <div
                style={{
                  position: 'absolute',
                  top: `${boundingBox.topPercent}%`,
                  left: `${boundingBox.leftPercent}%`,
                  width: `${boundingBox.widthPercent}%`,
                  height: `${boundingBox.heightPercent}%`,
                }}
                className={`border-2 rounded-lg pointer-events-none transition-all flex items-start p-1.5 shadow-lg ${
                  guiding ? 'border-accent-400 bg-accent-400/10 shadow-accent-400/30' : 'border-rose-500 bg-rose-500/10 shadow-rose-500/30'
                }`}
              >
                <span
                  className={`text-[10px] font-semibold text-white px-2 py-0.5 rounded shadow-sm ${guiding ? 'bg-accent-600' : 'bg-rose-600'}`}
                >
                  {guiding ? boundingBox.label || 'Look here' : detectedCode || 'ERROR DETECTED'}
                </span>
              </div>
            )}

            {/* Caption overlay: live tip while guiding, otherwise analysis status */}
            {(isProcessingFrame && !guiding) || liveTip ? (
              <div className="absolute bottom-20 inset-x-6 z-20 flex justify-center pointer-events-none">
                <div className="bg-slate-900/85 backdrop-blur-md text-white px-4 py-2.5 rounded-lg flex items-center gap-2.5 border border-white/10 max-w-md">
                  {liveTip ? (
                    <Eye className="w-5 h-5 text-accent-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-accent-400 animate-spin shrink-0" />
                  )}
                  <span className="text-sm text-white text-left leading-snug">
                    {liveTip || 'Analysing your screen…'}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Bottom controls */}
            <div className="absolute bottom-4 inset-x-8 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-lg bg-black/55 hover:bg-black/75 backdrop-blur-md text-white border border-white/15 flex items-center justify-center transition-colors"
                aria-label="Upload screenshot"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <button
                type="button"
                disabled={isProcessingFrame}
                onClick={() => {
                  resetDetection();
                  processRealFrame({ explicit: true });
                }}
                className="w-14 h-14 rounded-full border-[3px] border-white p-1 flex items-center justify-center bg-black/20 backdrop-blur-xs transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                aria-label="Scan now"
                title="Scan now"
              >
                <div className="w-full h-full rounded-full bg-white active:bg-accent-100 transition" />
              </button>

              {handsFree.supported ? (
                <button
                  type="button"
                  onClick={handsFree.toggle}
                  className={`w-10 h-10 rounded-lg backdrop-blur-md border flex items-center justify-center transition-colors ${
                    handsFree.enabled
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-black/55 hover:bg-black/75 text-white border-white/15'
                  }`}
                  aria-label={handsFree.enabled ? 'Turn off hands-free voice' : 'Turn on hands-free voice'}
                  aria-pressed={handsFree.enabled}
                >
                  {handsFree.enabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>
          </div>

          {/* Source: live camera vs. an example image (examples are tucked away to keep the view clean) */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeFrameImage && (
              <button
                type="button"
                onClick={() => {
                  setActiveFrameImage(null);
                  setActiveScenarioId(null);
                  resetDetection();
                  initPersistentCamera();
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-ink text-white shadow-xs flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Back to live camera
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowExamples((v) => !v)}
              aria-expanded={showExamples}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-ink-soft border border-hairline hover:bg-paper"
            >
              {showExamples ? 'Hide examples' : 'Try an example error'}
            </button>
          </div>
          {showExamples && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {REAL_WORLD_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleLoadScenario(sc)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                    activeScenarioId === sc.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-ink border border-hairline hover:bg-paper'
                  }`}
                >
                  {sc.title.replace(/^\d+\.\s*/, '')}
                </button>
              ))}
            </div>
          )}

          {handsFree.supported && (
            <p className="text-xs text-ink-soft flex items-center gap-1.5">
              {handsFree.enabled ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${handsFree.listening ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {handsFree.listening
                    ? 'Listening. Say “next”, “back”, “repeat”, “it’s fixed”, or ask a question.'
                    : 'Hands-free is on. Listening resumes when FixLens stops talking.'}
                </>
              ) : (
                'Turn on the microphone for hands-free guidance while you work.'
              )}
            </p>
          )}
          {handsFree.error && <p className="text-[11px] text-rose-600 font-medium">{handsFree.error}</p>}
        </div>

        {/* Guidance panel */}
        <div className="lg:col-span-5 p-5 sm:p-6 bg-white rounded-xl border border-hairline shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
          {errorMessage && (
            <div role="alert" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {guiding && currentStep ? (
            <div className="space-y-4" aria-live="polite">
              {/* Problem header */}
              <div>
                <span className="eyebrow text-accent-700 block">Now fixing</span>
                <h3 className="mt-1 font-display font-semibold tracking-tight text-2xl text-ink leading-tight">{latestReport!.problemSummary}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {detectedCode && (
                    <span className="text-[10px] font-mono font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                      {detectedCode}
                    </span>
                  )}
                  {latestReport!.systemContext && latestReport!.systemContext !== 'Unknown OS' && (
                    <span className="text-[10px] font-medium text-ink-soft bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {latestReport!.systemContext}
                    </span>
                  )}
                </div>
              </div>

              {fixedCandidate ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-medium text-emerald-900">Is the problem fixed now?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={confirmFixed}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Yes, it&apos;s fixed
                    </button>
                    <button
                      type="button"
                      onClick={notFixedYet}
                      className="py-2.5 bg-white border border-hairline text-ink rounded-lg text-xs font-semibold"
                    >
                      Not yet
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-ink-soft">
                      <span>
                        Step {guideIdx! + 1} of {steps.length}
                      </span>
                      {currentStep.isAdministratorRequired && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          {currentStep.actionType === 'terminal_cmd' ? 'Needs sudo' : 'Admin required'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1" aria-hidden="true">
                      {steps.map((_, i) => (
                        <span key={i} className={`h-1 flex-1 rounded-full ${i <= guideIdx! ? 'bg-ink' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Current step */}
                  <div className="space-y-2">
                    <h4 className="font-display font-semibold tracking-tight text-2xl sm:text-3xl text-ink leading-tight">{currentStep.title}</h4>
                    {currentStep.description && (
                      <p className="text-sm text-ink leading-relaxed select-text">{currentStep.description}</p>
                    )}
                  </div>

                  {currentStep.command && (
                    <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-800 text-xs font-mono space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-cyan-400 flex items-center gap-1 font-sans font-medium">
                          <Terminal className="w-3.5 h-3.5" />
                          {commandLabel(currentStep)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(currentStep.command || '')}
                          className="text-slate-300 hover:text-white flex items-center gap-1 font-sans font-semibold transition"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-cyan-300 break-all select-text">{currentStep.command}</div>
                    </div>
                  )}

                  {currentStep.safetyCaution && (
                    <div role="note" className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">{currentStep.safetyCaution}</span>
                    </div>
                  )}

                  {currentStep.expectedOutcome && (
                    <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100 flex items-start gap-2 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">
                        <strong>You should see:</strong> {currentStep.expectedOutcome}
                      </span>
                    </div>
                  )}

                  {liveTip && (
                    <div className="p-3 bg-paper rounded-lg border border-hairline flex items-start gap-2 text-xs text-ink">
                      <Eye className="w-4 h-4 shrink-0 mt-0.5 text-accent-600" />
                      <span className="font-medium leading-relaxed">{liveTip}</span>
                    </div>
                  )}

                  {/* Step controls */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={back}
                      disabled={guideIdx === 0}
                      className="py-3 bg-white hover:bg-paper border border-hairline text-ink rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={repeat}
                      className="py-3 bg-white hover:bg-paper border border-hairline text-ink rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Repeat
                    </button>
                    <button
                      type="button"
                      onClick={advance}
                      className="py-3 bg-ink hover:bg-ink-2 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      {guideIdx! < steps.length - 1 ? 'Next' : 'Done'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* Ask about this step (typed or spoken via hands-free) */}
              <div className="space-y-2 pt-1 border-t border-hairline">
                {exchange && (
                  <div className="space-y-1.5 pt-3 text-xs">
                    <p className="text-ink-soft">
                      <span className="font-medium text-ink">You:</span> {exchange.heard}
                    </p>
                    <p className="text-ink leading-relaxed">
                      <span className="font-medium text-blue-700">FixLens:</span>{' '}
                      {exchange.reply ?? <Loader2 className="inline w-3 h-3 animate-spin" />}
                    </p>
                  </div>
                )}
                <form
                  className="flex items-center gap-2 pt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    askQuestion(question);
                    setQuestion('');
                  }}
                >
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={1000}
                    placeholder="Stuck? Ask about this step…"
                    aria-label="Ask about this step"
                    className="flex-1 bg-slate-50 border border-hairline rounded-full px-3.5 py-2 text-xs text-ink placeholder:text-slate-400 focus:outline-none focus:border-accent-500"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim()}
                    className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center disabled:opacity-40"
                    aria-label="Send question"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    if (!latestReport) return;
                    stopPersistentCamera();
                    onAnalyzed(latestReport, { autoNavigate: true });
                  }}
                  className="w-full text-[11px] font-medium text-ink-soft hover:text-accent-600 flex items-center justify-center gap-1 pt-1"
                >
                  <FileText className="w-3 h-3" />
                  See full diagnosis & causes
                </button>
              </div>
            </div>
          ) : detectedError && latestReport ? (
            // Detected but no steps were returned
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ink leading-snug">{detectedError}</h3>
              {spokenGuidance && (
                <p className="p-3.5 bg-paper-deep/70 rounded-lg border border-hairline text-xs text-ink leading-relaxed">
                  {spokenGuidance}
                </p>
              )}
              {planning ? (
                <p className="flex items-center gap-2 text-sm text-ink-soft" role="status">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-600" />
                  Working out the step-by-step fix…
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    stopPersistentCamera();
                    onAnalyzed(latestReport, { autoNavigate: true });
                  }}
                  className="w-full py-3 bg-ink hover:bg-ink-2 text-white rounded-lg text-xs font-semibold"
                >
                  See full diagnosis
                </button>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-ink-soft space-y-3">
              <div className="w-12 h-12 rounded-lg bg-paper-deep text-accent-600 flex items-center justify-center mx-auto">
                {isProcessingFrame ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              </div>
              <p className="font-display font-semibold tracking-tight text-3xl text-ink leading-tight">
                {isProcessingFrame ? 'Looking at your screen…' : 'Point your camera at the error.'}
              </p>
              <p className="text-xs text-ink-soft">
                FixLens spots the problem automatically, then talks you through the fix step by step while it watches your screen.
              </p>
              <button
                type="button"
                disabled={isProcessingFrame}
                onClick={() => {
                  resetDetection();
                  processRealFrame({ explicit: true });
                }}
                className="px-4 py-2 bg-ink hover:bg-ink-2 text-white rounded-lg text-xs font-medium transition shadow-xs disabled:opacity-60"
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

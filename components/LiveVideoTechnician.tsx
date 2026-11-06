'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Sparkles,
  Zap,
  Play,
  Square,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Monitor,
  Smartphone,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { CompanionRepairAction, CompanionSystemStats } from '@/types/technician';

interface LiveVideoTechnicianProps {
  onSessionComplete?: (report: any) => void;
  onOpenCompanion: () => void;
}

export default function LiveVideoTechnician({
  onSessionComplete,
  onOpenCompanion,
}: LiveVideoTechnicianProps) {
  // Video and stream refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);

  // Camera & Stream states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Real-Time Solving Engine State
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [screenState, setScreenState] = useState<'IDLE' | 'ERROR_ACTIVE' | 'FIX_IN_PROGRESS' | 'RESOLVED' | 'NEW_ERROR'>('IDLE');
  const [detectedError, setDetectedError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [affectedComponent, setAffectedComponent] = useState<string | null>(null);
  const [spokenGuidance, setSpokenGuidance] = useState<string>('Point your camera at the computer screen and press Start Live Troubleshooting.');
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [exactCommand, setExactCommand] = useState<string>('');
  const [companionActionId, setCompanionActionId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [boundingBox, setBoundingBox] = useState<any | null>(null);
  const [isAutoSolving, setIsAutoSolving] = useState<boolean>(false);
  const [terminalOutput, setTerminalOutput] = useState<string | null>(null);

  // Audio / Speech
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [spokenUserQuery, setSpokenUserQuery] = useState<string>('');

  // Simulated Screen Stream for Instant Testing without a second device
  const [useSimulatedScreen, setUseSimulatedScreen] = useState<boolean>(false);
  const [simulatedScenario, setSimulatedScenario] = useState<'wifi' | 'spooler' | 'update' | 'storage'>('wifi');
  const [simulatedState, setSimulatedState] = useState<'error' | 'fixing' | 'resolved'>('error');

  // Speak aloud via TTS
  const speakRealtime = useCallback((text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }, [isMuted]);

  // Start Physical Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Camera access unavailable. Switch to the Simulated Computer Screen below to test real-time solving.');
      setIsCameraActive(false);
      setUseSimulatedScreen(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Toggle Camera
  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (isCameraActive) {
      startCamera();
    }
  };

  // Capture current video frame as base64 JPEG
  const grabCurrentFrame = useCallback((): string | null => {
    if (useSimulatedScreen) {
      // Generate frame from simulated screen canvas
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/jpeg', 0.9);
    }

    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [useSimulatedScreen]);

  // Real-Time Frame Processing Cycle
  const processFrame = useCallback(async () => {
    if (isProcessingFrame) return;

    const frameBase64 = grabCurrentFrame();
    if (!frameBase64) return;

    setIsProcessingFrame(true);

    try {
      const res = await fetch('/api/realtime-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameBase64,
          sessionContext: {
            detectedError,
            screenState,
            affectedComponent,
          },
          currentStepNumber: 1,
          userSpokenInput: spokenUserQuery,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        const a = data.analysis;
        setScreenState(a.screenState || 'ERROR_ACTIVE');
        if (a.detectedError) setDetectedError(a.detectedError);
        if (a.errorCode) setErrorCode(a.errorCode);
        if (a.affectedComponent) setAffectedComponent(a.affectedComponent);
        if (a.currentActionInstruction) setCurrentInstruction(a.currentActionInstruction);
        if (a.exactCommand) setExactCommand(a.exactCommand);
        if (a.companionActionId) setCompanionActionId(a.companionActionId);
        if (a.confidence) setConfidence(a.confidence);
        if (a.boundingBoxHint) setBoundingBox(a.boundingBoxHint);

        if (a.realtimeSpokenGuidance && a.realtimeSpokenGuidance !== spokenGuidance) {
          setSpokenGuidance(a.realtimeSpokenGuidance);
          speakRealtime(a.realtimeSpokenGuidance);
        }

        // If resolution is confirmed
        if (a.isResolved || a.screenState === 'RESOLVED') {
          setScreenState('RESOLVED');
          speakRealtime('Visual verification confirmed: Problem has been resolved in real time!');
        }
      }
    } catch (e) {
      console.warn('Real-time frame error:', e);
    } finally {
      setIsProcessingFrame(false);
      setSpokenUserQuery('');
    }
  }, [
    isProcessingFrame,
    grabCurrentFrame,
    detectedError,
    screenState,
    affectedComponent,
    spokenUserQuery,
    spokenGuidance,
    speakRealtime,
  ]);

  // Real-Time Polling Loop when Active
  useEffect(() => {
    let timer: any = null;
    if (isRealtimeActive && screenState !== 'RESOLVED') {
      timer = setInterval(() => {
        processFrame();
      }, 2600);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRealtimeActive, screenState, processFrame]);

  // Execute Auto-Solve in Real Time via Connected Companion
  const handleExecuteRealtimeFix = async () => {
    const actionId = companionActionId || (simulatedScenario === 'wifi' ? 'restart-wlan' : 'restart-spooler');
    setIsAutoSolving(true);
    setTerminalOutput(`[FixLens Real-Time Agent] Executing verified repair action: ${actionId}...`);

    try {
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_action',
          code: 'FXL-8821',
          actionId,
          userApproved: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTerminalOutput(`[Exit Code 0 - Success]\n${data.output}`);

        // If using simulated screen, change the simulated screen state to 'resolved'!
        if (useSimulatedScreen) {
          setSimulatedState('resolved');
        }

        speakRealtime('Command executed successfully. Now watching video feed to verify visual resolution.');
        setScreenState('FIX_IN_PROGRESS');

        // Immediately trigger verification frame
        setTimeout(() => {
          processFrame();
        }, 1500);
      } else {
        setTerminalOutput(`[Execution Error]\n${data.error || 'Command failed.'}`);
      }
    } catch (err: any) {
      setTerminalOutput(`[Network Error] ${err.message}`);
    } finally {
      setIsAutoSolving(false);
    }
  };

  // Toggle Live Real-Time Troubleshooting Session
  const toggleRealtimeSession = () => {
    if (isRealtimeActive) {
      setIsRealtimeActive(false);
      setScreenState('IDLE');
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    } else {
      setIsRealtimeActive(true);
      setScreenState('ERROR_ACTIVE');
      setTerminalOutput(null);
      if (!isCameraActive && !useSimulatedScreen) {
        startCamera();
      }
      speakRealtime('FixLens Real-Time Video Technician activated. Analyzing computer screen.');
      // Initial immediate frame check
      setTimeout(() => {
        processFrame();
      }, 500);
    }
  };

  // Speech Recognition setup for voice questioning
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (ev: any) => {
          const txt = ev.results[0][0].transcript;
          setSpokenUserQuery(txt);
          setIsListening(false);
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Mic start failed:', e);
      }
    }
  };

  // Render Simulated Screen Canvas (for live testing without physical screen)
  useEffect(() => {
    if (!useSimulatedScreen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 450;

    // Desktop wallpaper
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 450);

    // Desktop icons
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(20, 20, 30, 30);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Segoe UI';
    ctx.fillText('This PC', 20, 62);

    // Taskbar
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 415, 800, 35);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(390, 423, 20, 20);

    if (simulatedState === 'resolved') {
      // RESOLVED STATE SCREEN: Normal clean desktop with connected Wi-Fi / running app
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(740, 432, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px Segoe UI';
      ctx.fillText('Internet Access: Connected', 580, 436);

      // Success notification toast
      ctx.fillStyle = '#064e3b';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(520, 310, 260, 90, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px Segoe UI';
      ctx.fillText('Network Restored', 535, 335);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px Segoe UI';
      ctx.fillText('WLAN AutoConfig is running.', 535, 355);
      ctx.fillText('Link Speed: 866 Mbps (Internet OK)', 535, 375);
    } else {
      // ERROR ACTIVE STATE SCREEN: Windows Error Dialog
      // Taskbar disconnected icon
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(740, 432, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px Segoe UI';
      ctx.fillText('No Internet', 670, 436);

      // Centered Windows Error Dialog
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(200, 100, 400, 210, 8);
      ctx.fill();
      ctx.stroke();

      // Title bar
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(200, 100, 400, 32, [8, 8, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Segoe UI';
      ctx.fillText('Network Connections - Error', 215, 122);
      ctx.fillText('✕', 580, 122);

      // Red error icon
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(240, 175, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Segoe UI';
      ctx.fillText('✕', 234, 181);

      // Error message
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Segoe UI';
      ctx.fillText("Can't connect to this network", 270, 165);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px Segoe UI';
      ctx.fillText('The network location cannot be reached.', 270, 185);
      ctx.fillText('The WLAN AutoConfig service is not running.', 270, 205);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px Consolas';
      ctx.fillText('Error code: 0x800704cf', 270, 230);

      // Buttons
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(490, 260, 90, 32, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Segoe UI';
      ctx.fillText('Close', 520, 281);
    }
  }, [useSimulatedScreen, simulatedScenario, simulatedState]);

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Real-Time Live HUD Control Header */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isRealtimeActive ? 'bg-rose-500' : 'bg-slate-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isRealtimeActive ? 'bg-rose-500' : 'bg-slate-500'
              }`}
            />
          </span>
          <div>
            <div className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
              <span>{isRealtimeActive ? 'LIVE REAL-TIME SOLVING' : 'STANDBY VIEW'}</span>
              {isProcessingFrame && (
                <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {useSimulatedScreen ? 'Simulated Windows Screen' : 'Live Camera Video Feed'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (useSimulatedScreen) {
                setUseSimulatedScreen(false);
                startCamera();
              } else {
                setUseSimulatedScreen(true);
                stopCamera();
              }
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
              useSimulatedScreen
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Toggle between physical camera and simulated live screen"
          >
            {useSimulatedScreen ? 'Sim Screen' : 'Camera'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isMuted) window.speechSynthesis?.cancel();
              setIsMuted(!isMuted);
            }}
            className={`p-2 rounded-lg border text-xs transition ${
              isMuted
                ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                : 'bg-slate-800 text-cyan-400 border-slate-700'
            }`}
            title={isMuted ? 'Unmute technician speech' : 'Mute technician speech'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Primary Video / Viewfinder Stream Viewport */}
      <div className="w-full max-w-md relative aspect-[16/10] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        {/* Physical Camera Stream */}
        {!useSimulatedScreen && isCameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Simulated Screen Stream */}
        {useSimulatedScreen && (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain bg-slate-950"
          />
        )}

        {/* Camera not started idle overlay */}
        {!useSimulatedScreen && !isCameraActive && (
          <div className="p-6 text-center flex flex-col items-center">
            <Video className="w-10 h-10 text-cyan-400 mb-2 animate-pulse" />
            <h4 className="text-xs font-bold text-white">Live Camera Offline</h4>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">
              Start camera to aim phone at screen, or switch to simulated screen.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
            >
              Start Live Camera
            </button>
          </div>
        )}

        {/* Real-Time Optical AI Scanning Overlays */}
        {isRealtimeActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
            {/* Top HUD Laser Line & Tracking Reticle */}
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-white font-mono text-[9px] font-black tracking-widest animate-pulse flex items-center gap-1 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                OPTICAL TRACKING ON
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded-md border border-cyan-500/40">
                1080p FHD 30FPS
              </span>
            </div>

            {/* Scanning Laser Beam */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce" />

            {/* Visual Bounding Box over Error Region if detected */}
            {boundingBox && (
              <div
                style={{
                  position: 'absolute',
                  top: `${boundingBox.topPercent || 25}%`,
                  left: `${boundingBox.leftPercent || 20}%`,
                  width: `${boundingBox.widthPercent || 60}%`,
                  height: `${boundingBox.heightPercent || 45}%`,
                }}
                className="border-2 border-rose-500 bg-rose-500/10 rounded-lg pointer-events-none transition-all duration-300 flex flex-col justify-between p-1 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                <span className="text-[9px] font-bold text-rose-300 bg-rose-950/90 px-1 py-0.2 rounded self-start border border-rose-800">
                  {boundingBox.label || 'ERROR TARGET'}
                </span>
                <span className="text-[8px] font-mono text-rose-200 self-end">
                  CONF: {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            {/* Bottom Target Bracket */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>FIXLENS FORENSIC HUD</span>
              <span className="text-emerald-400 font-bold">
                {screenState === 'RESOLVED' ? 'STATUS: PROBLEM SOLVED' : 'STATUS: LIVE ACTIVE'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Big Action Bar: Start Real-Time Diagnosis & Solve */}
      <div className="w-full max-w-md flex flex-col gap-2">
        <button
          type="button"
          onClick={toggleRealtimeSession}
          className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-2xl transition-all duration-200 active:scale-[0.98] ${
            isRealtimeActive
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/80 animate-pulse'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-950/80'
          }`}
        >
          {isRealtimeActive ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>STOP REAL-TIME TECHNICIAN</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>START REAL-TIME DIAGNOSIS & AUTO-SOLVE</span>
            </>
          )}
        </button>
      </div>

      {/* Real-Time Spoken Guidance Callout */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-white">Live Voice Guidance</span>
          </div>

          <button
            type="button"
            onClick={toggleMic}
            className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Ask a voice question while troubleshooting"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="text-[10px]">{isListening ? 'Listening...' : 'Speak'}</span>
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-200 flex items-start gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">{spokenGuidance}</p>
        </div>
      </div>

      {/* Real-Time Detection & Resolution Banner */}
      {detectedError && (
        <div
          className={`w-full max-w-md p-3.5 rounded-2xl border flex flex-col gap-2.5 shadow-xl transition-all duration-300 ${
            screenState === 'RESOLVED'
              ? 'bg-emerald-950/80 border-emerald-600 text-emerald-100'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {screenState === 'RESOLVED' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
                  {screenState === 'RESOLVED' ? 'PROBLEM RESOLVED IN REAL TIME' : 'DETECTED ERROR'}
                </span>
                <span className="text-xs font-extrabold text-white">{detectedError}</span>
              </div>
            </div>

            {errorCode && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                {errorCode}
              </span>
            )}
          </div>

          {/* Current Real-Time Action Instruction */}
          {currentInstruction && (
            <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-cyan-400 block mb-0.5">Recommended Action:</span>
              {currentInstruction}
            </div>
          )}

          {/* Auto-Solve Execution Button for Connected Mode */}
          {screenState !== 'RESOLVED' && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isAutoSolving}
                onClick={handleExecuteRealtimeFix}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition active:scale-95 disabled:opacity-50"
              >
                {isAutoSolving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Safe Fix on PC...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Execute Verified Auto-Fix on Computer</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenCompanion}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl"
                title="Open Mode B Connected Diagnostics"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          )}

          {/* Real-Time Live PowerShell Output Stream */}
          {terminalOutput && (
            <div className="bg-black border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-900 pb-1">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span>Real-Time Windows Execution Stream</span>
                </span>
                <span className="text-emerald-400">Live</span>
              </div>
              <pre className="font-mono text-[10px] text-emerald-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                {terminalOutput}
              </pre>
            </div>
          )}

          {/* Resolution Celebration Card */}
          {screenState === 'RESOLVED' && (
            <div className="p-2.5 bg-emerald-950 border border-emerald-700/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-200 block">
                  Empirical Verification: 100% Solved
                </span>
                <span className="text-[10px] text-emerald-300">
                  The error dialog disappeared and system services resumed.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimulatedState('error');
                  setScreenState('ERROR_ACTIVE');
                  setTerminalOutput(null);
                  speakRealtime('Resetting test state. Pointing camera at screen.');
                }}
                className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-[10px] font-bold rounded-lg flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Test Again</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

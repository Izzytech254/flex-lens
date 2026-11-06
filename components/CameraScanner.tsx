'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Upload,
  Zap,
  ZapOff,
  Sparkles,
  Layers,
  HelpCircle,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import { REAL_WORLD_SCENARIOS } from '@/lib/scenarios';
import { TroubleshootingScenario } from '@/types/technician';

interface CameraScannerProps {
  onCapture: (base64Image: string, userDescription: string) => void;
  isAnalyzing: boolean;
  onOpenScenarios: () => void;
}

export default function CameraScanner({
  onCapture,
  isAnalyzing,
  onOpenScenarios,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frozenPreview, setFrozenPreview] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<TroubleshootingScenario | null>(null);

  // Start camera stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. You can still upload a photo or choose a preloaded test case below.'
          : 'Unable to access rear camera on this device. Upload or use test scenarios.'
      );
      setCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle torch/flashlight if supported
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
      if ('torch' in capabilities) {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } else {
        alert('Torch/flashlight is not supported on this device camera.');
      }
    } catch (e) {
      console.warn('Torch constraint error:', e);
    }
  };

  // Switch rear/front camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video stream
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFrozenPreview(dataUrl);
    stopCamera();
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFrozenPreview(result);
      setSelectedScenario(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Quick select a scenario
  const handleSelectScenario = (scenario: TroubleshootingScenario) => {
    setSelectedScenario(scenario);
    setFrozenPreview(scenario.imageUrl);
    setUserPrompt(scenario.sampleUserPrompt);
    stopCamera();
  };

  // Submit for real multimodal diagnosis
  const handleSubmitDiagnosis = () => {
    if (!frozenPreview && !userPrompt) return;
    onCapture(frozenPreview || '', userPrompt);
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Bar with Camera Controls */}
      <div className="w-full max-w-md flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-t-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                cameraActive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                cameraActive ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </span>
          <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
            {cameraActive ? 'Scanner Live (Rear)' : frozenPreview ? 'Capture Locked' : 'Scanner Ready'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {cameraActive && (
            <>
              <button
                type="button"
                onClick={toggleTorch}
                title="Toggle Flash/Torch"
                className={`p-2 rounded-lg text-xs font-medium transition ${
                  torchOn ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Switch Camera"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenScenarios}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-400 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 rounded-lg transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Test Scenarios</span>
          </button>
        </div>
      </div>

      {/* Viewfinder Area */}
      <div className="w-full max-w-md relative aspect-[4/3] bg-slate-950 border-x border-slate-800 overflow-hidden flex items-center justify-center">
        {/* Live Camera View */}
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Frozen / Selected Preview */}
        {frozenPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frozenPreview}
            alt="Screen capture to diagnose"
            className="w-full h-full object-contain bg-slate-900"
          />
        )}

        {/* Reticle / Visual Targeting Guidelines */}
        {(cameraActive || frozenPreview) && (
          <div className="absolute inset-4 border border-cyan-500/40 rounded-xl pointer-events-none flex flex-col justify-between p-2">
            <div className="flex justify-between items-start">
              <span className="w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <span className="text-[10px] font-mono text-cyan-400/80 bg-slate-950/70 px-1.5 py-0.5 rounded">
                FIXLENS AI OPTICS
              </span>
              <span className="w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-medium text-cyan-200 bg-slate-950/80 px-2.5 py-1 rounded-full border border-cyan-500/30 backdrop-blur-sm">
                Align error dialog or terminal in frame
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <span className="text-[10px] font-mono text-slate-400">1080p FHD</span>
              <span className="w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            </div>
          </div>
        )}

        {/* Idle State when Camera not yet started and no preview */}
        {!cameraActive && !frozenPreview && (
          <div className="p-6 text-center flex flex-col items-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center mb-3 text-cyan-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Point at Computer Screen</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Open your smartphone camera to scan the real error dialog, terminal, or BSOD.
            </p>

            <button
              type="button"
              onClick={() => startCamera('environment')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition transform active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Start Live Camera
            </button>

            {cameraError && (
              <div className="mt-3 p-2 bg-amber-950/60 border border-amber-800/60 rounded-lg text-[11px] text-amber-200 text-left">
                {cameraError}
              </div>
            )}
          </div>
        )}

        {/* Retake/Unlock Button overlay when frozen */}
        {frozenPreview && (
          <button
            type="button"
            onClick={() => {
              setFrozenPreview(null);
              setSelectedScenario(null);
              startCamera();
            }}
            className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retake</span>
          </button>
        )}
      </div>

      {/* Hidden file input & Canvas */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md bg-slate-900/90 border-x border-b border-slate-800 rounded-b-2xl p-3 flex flex-col gap-3">
        {/* Shutter / Capture Button */}
        {cameraActive && (
          <div className="flex items-center justify-around py-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center text-slate-400 hover:text-slate-200 transition"
              title="Upload existing screenshot"
            >
              <Upload className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Upload</span>
            </button>

            <button
              type="button"
              onClick={captureFrame}
              className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center bg-cyan-500/20 active:scale-90 transition shadow-lg shadow-cyan-500/20 hover:border-cyan-300"
              title="Capture screen frame"
            >
              <div className="w-12 h-12 rounded-full bg-white active:bg-cyan-200" />
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="flex flex-col items-center text-slate-400 hover:text-slate-200 transition"
              title="Stop Camera"
            >
              <RotateCcw className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Close</span>
            </button>
          </div>
        )}

        {/* User Description Input */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">Describe what happened (Optional)</span>
            {selectedScenario && (
              <span className="text-cyan-400 font-mono text-[10px]">
                Preset: {selectedScenario.errorBadge}
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. My Wi-Fi disconnected and says error 0x800704cf when trying to reconnect..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 resize-none transition"
            />
          </div>
        </div>

        {/* Action Buttons: Diagnose or Select Quick Preset */}
        <div className="flex items-center gap-2">
          {!cameraActive && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-xs font-semibold flex items-center justify-center transition"
              title="Upload photo or screenshot"
            >
              <FileImage className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            disabled={(!frozenPreview && !userPrompt.trim()) || isAnalyzing}
            onClick={handleSubmitDiagnosis}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition shadow-md ${
              isAnalyzing
                ? 'bg-cyan-900/50 text-cyan-200 cursor-wait border border-cyan-700/50'
                : !frozenPreview && !userPrompt.trim()
                ? 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-900/40 active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                <span>FixLens AI Vision Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Diagnose Screen with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Scenario Chips */}
        <div className="border-t border-slate-800/80 pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Test Real Scenarios (8 Scenarios)
            </span>
            <button
              type="button"
              onClick={onOpenScenarios}
              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              <span>View all</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {REAL_WORLD_SCENARIOS.slice(0, 4).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-medium border transition ${
                  selectedScenario?.id === sc.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {sc.title.split('.')[1] || sc.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

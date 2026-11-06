'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Upload,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { VerificationResult, TroubleshootingStep } from '@/types/technician';

interface VisualVerificationModalProps {
  initialImage?: string;
  stepBeingVerified?: TroubleshootingStep;
  originalProblem: string;
  onClose: () => void;
  onVerificationComplete: (result: VerificationResult) => void;
}

export default function VisualVerificationModal({
  initialImage,
  stepBeingVerified,
  originalProblem,
  onClose,
  onVerificationComplete,
}: VisualVerificationModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [verificationImage, setVerificationImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera verification access issue:', err);
      setErrorMsg('Camera access unavailable. You can upload a photo or screenshot to verify.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  };

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
    setVerificationImage(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setVerificationImage(dataUrl);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Run visual AI verification
  const handleRunVerification = async () => {
    if (!verificationImage) return;
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialImageBase64: initialImage,
          verificationImageBase64: verificationImage,
          originalProblem,
          stepCompleted: stepBeingVerified
            ? `Step #${stepBeingVerified.stepNumber}: ${stepBeingVerified.title} (${stepBeingVerified.expectedOutcome})`
            : 'Troubleshooting steps applied',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Verification analysis failed.');
      }

      setResult(data.verification);
      onVerificationComplete(data.verification);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete visual verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((mediaStream) => {
        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Camera verification access issue:', err);
        setErrorMsg('Camera access unavailable. You can upload a photo or screenshot to verify.');
        setCameraActive(false);
      });

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-4 flex flex-col gap-3 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Camera className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Visual Repair Verification</h3>
              <p className="text-[10px] text-slate-400">
                Point at the computer screen to verify honest resolution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Capture Box */}
        <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {cameraActive && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {verificationImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={verificationImage}
              alt="Verification capture"
              className="w-full h-full object-contain"
            />
          )}

          {!cameraActive && !verificationImage && (
            <div className="p-4 text-center flex flex-col items-center">
              <Camera className="w-8 h-8 text-slate-600 mb-2" />
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold"
              >
                Start Camera
              </button>
            </div>
          )}

          {/* Reticle */}
          {(cameraActive || verificationImage) && (
            <div className="absolute inset-3 border border-emerald-500/40 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <span className="text-[9px] font-mono text-emerald-300 bg-slate-950/80 px-1.5 py-0.5 rounded self-start">
                POST-REPAIR CHECK
              </span>
              <span className="text-[10px] text-center font-medium text-emerald-200 bg-slate-950/70 px-2 py-0.5 rounded-full self-center">
                Capture the resulting screen or terminal
              </span>
              <span className="text-[9px] font-mono text-slate-400 self-end">
                {stepBeingVerified ? `Verifying Step #${stepBeingVerified.stepNumber}` : 'Full Verification'}
              </span>
            </div>
          )}
        </div>

        {/* Controls when camera active */}
        {cameraActive && (
          <div className="flex items-center justify-between px-4 py-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={captureFrame}
              className="w-12 h-12 rounded-full border-4 border-emerald-400 bg-emerald-500/20 flex items-center justify-center active:scale-95 transition"
            >
              <div className="w-8 h-8 rounded-full bg-white" />
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        {/* Verification Result Display */}
        {result && (
          <div
            className={`p-3 rounded-2xl border flex flex-col gap-2 ${
              result.isResolved
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : result.status === 'PARTIALLY_RESOLVED'
                ? 'bg-amber-950/70 border-amber-800 text-amber-200'
                : 'bg-rose-950/70 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.isResolved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  Status: {result.status.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-black/40">
                {Math.round(result.confidence * 100)}% CONFIDENCE
              </span>
            </div>

            <p className="text-xs leading-relaxed">{result.explanation}</p>

            {result.detectedDifferences.length > 0 && (
              <div className="text-[11px] bg-black/30 p-2 rounded-xl flex flex-col gap-1">
                <span className="font-semibold text-slate-300">Observed Changes:</span>
                {result.detectedDifferences.map((diff, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-200">
                    <span className="text-cyan-400">•</span>
                    <span>{diff}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[11px] font-medium text-slate-300 border-t border-white/10 pt-1.5">
              <span className="font-bold text-white">Technician Advice:</span>{' '}
              {result.recommendedNextStep}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {verificationImage && !result && (
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleRunVerification}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Comparing Screen Forensics...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Verify with AI Vision</span>
                </>
              )}
            </button>
          )}

          {verificationImage && (
            <button
              type="button"
              onClick={() => {
                setVerificationImage(null);
                setResult(null);
                startCamera();
              }}
              className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Retake
            </button>
          )}

          {result && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl"
            >
              Done & Return
            </button>
          )}
        </div>

        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

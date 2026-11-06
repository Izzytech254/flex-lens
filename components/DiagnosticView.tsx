'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookOpen,
  ArrowRight,
  Info,
} from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';

interface DiagnosticViewProps {
  report: DiagnosisReport;
  onStartTroubleshooting: () => void;
  onOpenConnectedCompanion?: () => void;
}

export default function DiagnosticView({
  report,
  onStartTroubleshooting,
  onOpenConnectedCompanion,
}: DiagnosticViewProps) {
  const [showAdvancedDossier, setShowAdvancedDossier] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'causes' | 'evidence' | 'docs'>('overview');

  const confidenceColor =
    report.confidence === 'HIGH'
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80'
      : report.confidence === 'MEDIUM'
      ? 'text-amber-400 bg-amber-950/60 border-amber-800/80'
      : 'text-rose-400 bg-rose-950/60 border-rose-800/80';

  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      {/* Primary Diagnosis Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        {/* Header badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              {report.affectedComponent}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColor}`}>
              {report.confidence} CONFIDENCE
            </span>
            {report.detectedErrorCodes.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/80">
                {report.detectedErrorCodes[0]}
              </span>
            )}
          </div>
        </div>

        {/* Problem Summary headline */}
        <div>
          <h2 className="text-base font-bold text-white leading-snug">
            {report.problemSummary}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            System Context: <span className="text-slate-300 font-medium">{report.systemContext}</span>
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('causes')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'causes'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Causes ({report.possibleCauses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'evidence'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evidence & Facts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'docs'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Docs ({report.citations.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-3">
            {/* Quick Primary Cause Callout */}
            {report.possibleCauses.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Primary Suspected Root Cause
                  </span>
                  <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                    {report.possibleCauses[0].probability} PROBABILITY
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-100">
                  {report.possibleCauses[0].title}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {report.possibleCauses[0].whyLikely}
                </p>
                <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-900 pt-1">
                  <span className="font-semibold text-slate-400">Visual Evidence:</span>{' '}
                  {report.possibleCauses[0].evidence}
                </div>
              </div>
            )}

            {/* Steps count & CTA preview */}
            <div className="flex items-center justify-between p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-xl">
              <div>
                <div className="text-xs font-bold text-cyan-300">
                  {report.troubleshootingSteps.length} Verified Repair Steps Ready
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Step-by-step guidance with camera verification & voice.
                </p>
              </div>

              <button
                type="button"
                onClick={onStartTroubleshooting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-950 transition active:scale-95"
              >
                <span>Start</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Ranked Causes */}
        {activeTab === 'causes' && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-slate-400">
              The AI diagnostic engine evaluated potential causes based on forensic screen evidence:
            </p>
            {report.possibleCauses.map((cause, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    #{idx + 1} {cause.title}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                      cause.probability === 'HIGH'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                        : cause.probability === 'MEDIUM'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cause.probability} LIKELIHOOD
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">{cause.whyLikely}</p>
                <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-lg mt-1 border border-slate-800/80">
                  <span className="text-cyan-400 font-semibold">Supporting Evidence:</span>{' '}
                  {cause.evidence}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Observed Symptoms & Confirmed Facts */}
        {activeTab === 'evidence' && (
          <div className="flex flex-col gap-3">
            {/* Confirmed facts */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmed Visual Facts</span>
              </div>
              <ul className="flex flex-col gap-1">
                {report.confirmedFacts.map((fact, idx) => (
                  <li
                    key={idx}
                    className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-start gap-1.5"
                  >
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Observed symptoms */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Observed Symptoms</span>
              </div>
              <ul className="flex flex-col gap-1">
                {report.observedSymptoms.map((sym, idx) => (
                  <li
                    key={idx}
                    className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-start gap-1.5"
                  >
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{sym}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing info */}
            {report.missingInformation.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 mb-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Pending / Missing Diagnostics</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {report.missingInformation.map((info, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80"
                    >
                      ? {info}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Official Authoritative Documentation */}
        {activeTab === 'docs' && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-slate-400">
              Verified technical procedures referenced from official vendor and Microsoft engineering documentation:
            </p>
            {report.citations.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-950 hover:bg-slate-800/60 border border-slate-800 rounded-xl flex flex-col gap-1 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    {doc.authority}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-200 transition">
                  {doc.sourceTitle}
                </div>
                <p className="text-[11px] text-slate-400">{doc.summary}</p>
                {doc.kbOrErrorCode && (
                  <span className="text-[10px] font-mono text-slate-500">
                    Ref ID: {doc.kbOrErrorCode}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStartTroubleshooting}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <span>Begin Step-by-Step Repair Guide</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {onOpenConnectedCompanion && (
          <button
            type="button"
            onClick={onOpenConnectedCompanion}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-xs font-semibold flex items-center justify-center transition"
            title="Open Windows Companion Diagnostics"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </button>
        )}
      </div>
    </div>
  );
}

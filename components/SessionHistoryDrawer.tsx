'use client';

import React from 'react';
import { History, X, Trash2, ArrowRight, Clock, Cpu } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';

interface SessionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DiagnosisReport[];
  onSelectSession: (report: DiagnosisReport) => void;
  onClearHistory: () => void;
}

export default function SessionHistoryDrawer({
  isOpen,
  onClose,
  history,
  onSelectSession,
  onClearHistory,
}: SessionHistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-sm h-full p-4 flex flex-col gap-3 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <History className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Diagnostic History</h3>
              <p className="text-[10px] text-slate-400">Previous computer repair sessions</p>
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

        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <History className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No previous repair sessions recorded yet.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectSession(item);
                  onClose();
                }}
                className="p-3 bg-slate-950 hover:bg-slate-800/70 border border-slate-800 rounded-xl flex flex-col gap-1.5 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  {item.detectedErrorCodes.length > 0 && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80">
                      {item.detectedErrorCodes[0]}
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                  {item.problemSummary}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-500" />
                    {item.affectedComponent}
                  </span>
                  <div className="flex items-center gap-0.5 text-cyan-400 font-semibold group-hover:translate-x-1 transition">
                    <span>Resume</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="w-full py-2 bg-slate-800/60 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700/60"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>
    </div>
  );
}

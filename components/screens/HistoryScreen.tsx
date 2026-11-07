'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, ChevronRight, Trash2, Wifi, Printer, RefreshCw } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';

interface HistoryScreenProps {
  history: DiagnosisReport[];
  onSelectReport: (report: DiagnosisReport) => void;
  onClearHistory: () => void;
  onLaunchScan?: (preset?: 'wifi' | 'printer' | 'update') => void;
}

function statusOf(item: DiagnosisReport) {
  if (item.resolved === true) return { label: 'Resolved', color: 'bg-emerald-500', Icon: CheckCircle2 };
  if (item.resolved === false) return { label: 'Not fixed', color: 'bg-rose-500', Icon: AlertCircle };
  return { label: 'Diagnosed', color: 'bg-blue-500', Icon: HelpCircle };
}

export default function HistoryScreen({ history, onSelectReport, onClearHistory, onLaunchScan }: HistoryScreenProps) {
  const handleClear = () => {
    if (history.length === 0) return;
    if (window.confirm('Delete all saved diagnoses from this device?')) onClearHistory();
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="w-8" />
        <h2 className="text-base font-extrabold text-slate-900">History</h2>
        <button
          type="button"
          onClick={handleClear}
          disabled={history.length === 0}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-600 transition disabled:opacity-30"
          aria-label="Clear history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {history.length > 0 ? (
        <ul className="space-y-3">
          {history.map((item, idx) => {
            const { label, color, Icon } = statusOf(item);
            return (
              <li key={item.id || idx}>
                <button
                  type="button"
                  onClick={() => onSelectReport(item)}
                  className="w-full text-left p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full ${color} text-white flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                        {item.problemSummary}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {label} · {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-blue-600 shrink-0">
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-4">
          <p className="text-sm font-bold text-slate-900">No diagnoses yet</p>
          <p className="text-xs text-slate-500">
            Your scans are saved here on this device only. Try one of these examples:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { preset: 'wifi' as const, label: 'Wi-Fi', Icon: Wifi },
              { preset: 'printer' as const, label: 'Printer', Icon: Printer },
              { preset: 'update' as const, label: 'Update', Icon: RefreshCw },
            ].map(({ preset, label, Icon }) => (
              <button
                key={preset}
                type="button"
                onClick={() => onLaunchScan?.(preset)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-xs font-bold text-slate-700 flex flex-col items-center gap-1.5 transition"
              >
                <Icon className="w-5 h-5 text-blue-600" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

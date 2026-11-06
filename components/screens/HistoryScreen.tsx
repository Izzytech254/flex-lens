'use client';

import React from 'react';
import {
  CheckCircle2,
  Info,
  AlertCircle,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';

interface HistoryScreenProps {
  history: DiagnosisReport[];
  onSelectReport: (report: DiagnosisReport) => void;
  onChangeTab?: (tab: 'home' | 'history' | 'settings') => void;
  onClearHistory: () => void;
  onLaunchScan?: (preset?: 'wifi' | 'printer' | 'update') => void;
}

export default function HistoryScreen({
  history,
  onSelectReport,
  onClearHistory,
  onLaunchScan,
}: HistoryScreenProps) {
  // Benchmark scenarios available if user wants to test
  const demoHistory = [
    {
      id: 'demo-1',
      title: 'Wi-Fi Connection',
      status: 'Resolved · 2 min ago',
      iconType: 'green',
      preset: 'wifi' as const,
    },
    {
      id: 'demo-2',
      title: 'App Installation',
      status: 'Resolved · 1 hour ago',
      iconType: 'blue',
      preset: 'update' as const,
    },
    {
      id: 'demo-3',
      title: 'Printer Not Found',
      status: 'Resolved · 1 day ago',
      iconType: 'red',
      preset: 'printer' as const,
    },
    {
      id: 'demo-4',
      title: 'Windows Update',
      status: 'Resolved · 2 days ago',
      iconType: 'green',
      preset: 'update' as const,
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 select-none animate-fadeIn space-y-6">
      {/* Top Header matching Showcase Screen 8 */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="w-8" />
        <h2 className="text-base font-extrabold text-slate-900">
          History
        </h2>
        <button
          type="button"
          onClick={onClearHistory}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
          title="Reset history"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* History Items matching Showcase Screen 8 */}
      <div className="space-y-3">
        {history.length > 0 ? (
          history.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => onSelectReport(item)}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                    {item.problemSummary}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Resolved · {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))
        ) : (
          demoHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => onLaunchScan?.(item.preset)}
              className="p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full text-white flex items-center justify-center shrink-0 ${
                    item.iconType === 'green'
                      ? 'bg-emerald-500'
                      : item.iconType === 'blue'
                      ? 'bg-blue-500'
                      : 'bg-rose-500'
                  }`}
                >
                  {item.iconType === 'green' && <CheckCircle2 className="w-5 h-5" />}
                  {item.iconType === 'blue' && <Info className="w-5 h-5" />}
                  {item.iconType === 'red' && <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {item.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

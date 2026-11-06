'use client';

import React from 'react';
import { Layers, X, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { REAL_WORLD_SCENARIOS } from '@/lib/scenarios';
import { TroubleshootingScenario } from '@/types/technician';

interface ScenarioGalleryModalProps {
  onClose: () => void;
  onSelectScenario: (scenario: TroubleshootingScenario) => void;
}

export default function ScenarioGalleryModal({
  onClose,
  onSelectScenario,
}: ScenarioGalleryModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-4 flex flex-col gap-3 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">8 Real-World Test Scenarios</h3>
              <p className="text-[11px] text-slate-400">
                Mandatory production benchmark cases for computer troubleshooting
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

        {/* Scenarios Grid */}
        <div className="flex flex-col gap-2.5">
          {REAL_WORLD_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="p-3 bg-slate-950 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col gap-2 transition group cursor-pointer"
              onClick={() => {
                onSelectScenario(scenario);
                onClose();
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                  {scenario.title}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                  {scenario.errorBadge}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {scenario.shortDescription}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                <span className="font-semibold text-slate-500">
                  Category: {scenario.category}
                </span>
                <div className="flex items-center gap-1 text-cyan-400 font-bold group-hover:translate-x-1 transition">
                  <span>Load into Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

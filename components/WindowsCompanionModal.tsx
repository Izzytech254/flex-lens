'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  Terminal,
  Activity,
  Wifi,
  HardDrive,
  Cpu,
  RefreshCw,
  X,
  Play,
  Lock,
} from 'lucide-react';
import { CompanionRepairAction, CompanionSystemStats } from '@/types/technician';

interface WindowsCompanionModalProps {
  onClose: () => void;
  onCompanionContextUpdate?: (stats: CompanionSystemStats) => void;
}

export default function WindowsCompanionModal({
  onClose,
  onCompanionContextUpdate,
}: WindowsCompanionModalProps) {
  const [pairingCode] = useState<string>('FXL-8821');
  const [stats, setStats] = useState<CompanionSystemStats | null>(null);
  const [availableActions, setAvailableActions] = useState<CompanionRepairAction[]>([]);
  const [pendingAction, setPendingAction] = useState<CompanionRepairAction | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/companion?code=${pairingCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && data.session) {
          setStats(data.session.stats);
          setAvailableActions(data.session.availableActions || []);
          if (onCompanionContextUpdate) {
            onCompanionContextUpdate(data.session.stats);
          }
        }
      })
      .catch((e) => console.warn(e));

    return () => {
      active = false;
    };
  }, [pairingCode, onCompanionContextUpdate]);

  const refreshStats = async () => {
    try {
      const res = await fetch(`/api/companion?code=${pairingCode}`);
      const data = await res.json();
      if (data.success && data.session) {
        setStats(data.session.stats);
        setAvailableActions(data.session.availableActions || []);
        if (onCompanionContextUpdate) {
          onCompanionContextUpdate(data.session.stats);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleInitiateAction = (actionItem: CompanionRepairAction) => {
    setActionResult(null);
    if (actionItem.requiresAdmin) {
      setPendingAction(actionItem);
    } else {
      executeAction(actionItem.id, true);
    }
  };

  const executeAction = async (actionId: string, userApproved: boolean) => {
    setExecutingActionId(actionId);
    setPendingAction(null);
    try {
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_action',
          code: pairingCode,
          actionId,
          userApproved,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionResult({ status: 'success', actionId, output: data.output });
        refreshStats();
      } else {
        setActionResult({ status: 'failed', actionId, output: data.error || 'Failed' });
      }
    } catch (err: any) {
      setActionResult({ status: 'failed', actionId, output: err.message || 'Error' });
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 flex flex-col gap-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">PC Companion</h3>
            <span className="font-mono text-xs text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">
              {pairingCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close companion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div role="note" className="p-2.5 bg-amber-950/50 border border-amber-800/70 rounded-xl text-[11px] text-amber-200 leading-relaxed">
          <strong className="text-amber-300">Preview:</strong> repair actions here are simulated for demonstration and are
          not run on your PC. The PowerShell script only shares read-only system status.
        </div>

        {/* Script download */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div className="text-xs">
            <span className="font-bold text-white block">PowerShell Script</span>
            <span className="text-[11px] text-slate-400">Run on Windows PC</span>
          </div>

          <a
            href={`/api/companion/download?code=${pairingCode}`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .ps1</span>
          </a>
        </div>

        {/* Telemetry Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Host</span>
              <span className="text-white font-semibold line-clamp-1">{stats.computerName}</span>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Network</span>
              <span
                className={`font-semibold ${
                  stats.internetReachable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.internetReachable ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Disk Free</span>
              <span className="text-white font-semibold">{stats.diskFreeGb} GB</span>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Spooler</span>
              <span className="text-white font-semibold">{stats.spoolerStatus}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Actions
          </span>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {availableActions.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div className="text-xs">
                  <span className="font-bold text-white block">{item.title}</span>
                  <span className="text-[10px] text-slate-400">{item.description}</span>
                </div>

                <button
                  type="button"
                  disabled={executingActionId === item.id}
                  onClick={() => handleInitiateAction(item)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition"
                >
                  {executingActionId === item.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    'Run'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action output terminal */}
        {actionResult && (
          <div
            className={`p-2.5 bg-black border border-slate-800 rounded-xl font-mono text-[11px] max-h-24 overflow-y-auto whitespace-pre-wrap ${
              actionResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {actionResult.output}
          </div>
        )}

        {/* Approval prompt */}
        {pendingAction && (
          <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs space-y-2">
            <span className="font-bold text-amber-300 block">Confirm Action</span>
            <code className="text-cyan-300 block text-[11px] font-mono">
              {pendingAction.command}
            </code>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex-1 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeAction(pendingAction.id, true)}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                Execute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

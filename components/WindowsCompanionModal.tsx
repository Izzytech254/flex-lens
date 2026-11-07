'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, RefreshCw, X, Play } from 'lucide-react';
import { CompanionRepairAction, CompanionSystemStats } from '@/types/technician';
import { Badge, Button, IconButton, Notice } from '@/components/ui';

interface WindowsCompanionModalProps {
  onClose: () => void;
  onCompanionContextUpdate?: (stats: CompanionSystemStats) => void;
}

export default function WindowsCompanionModal({ onClose, onCompanionContextUpdate }: WindowsCompanionModalProps) {
  const [pairingCode] = useState<string>('FXL-8821');
  const [stats, setStats] = useState<CompanionSystemStats | null>(null);
  const [availableActions, setAvailableActions] = useState<CompanionRepairAction[]>([]);
  const [pendingAction, setPendingAction] = useState<CompanionRepairAction | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ status: 'success' | 'failed'; actionId: string; output: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/companion?code=${pairingCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && data.session) {
          setStats(data.session.stats);
          setAvailableActions(data.session.availableActions || []);
          onCompanionContextUpdate?.(data.session.stats);
        }
      })
      .catch((e) => console.warn(e));
    return () => {
      active = false;
    };
  }, [pairingCode, onCompanionContextUpdate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const refreshStats = async () => {
    try {
      const res = await fetch(`/api/companion?code=${pairingCode}`);
      const data = await res.json();
      if (data.success && data.session) {
        setStats(data.session.stats);
        setAvailableActions(data.session.availableActions || []);
        onCompanionContextUpdate?.(data.session.stats);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const executeAction = async (actionId: string, userApproved: boolean) => {
    setExecutingActionId(actionId);
    setPendingAction(null);
    try {
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute_action', code: pairingCode, actionId, userApproved }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResult({ status: 'success', actionId, output: data.output });
        refreshStats();
      } else {
        setActionResult({ status: 'failed', actionId, output: data.error || 'Failed' });
      }
    } catch (err: any) {
      setActionResult({ status: 'failed', actionId, output: err?.message || 'Error' });
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleInitiateAction = (actionItem: CompanionRepairAction) => {
    setActionResult(null);
    if (actionItem.requiresAdmin) setPendingAction(actionItem);
    else executeAction(actionItem.id, true);
  };

  const statItems = stats
    ? [
        { label: 'Computer', value: stats.computerName },
        { label: 'Internet', value: stats.internetReachable ? 'Online' : 'Offline', tone: stats.internetReachable ? 'text-emerald-700' : 'text-rose-700' },
        { label: 'Free disk', value: `${stats.diskFreeGb} GB` },
        { label: 'Print spooler', value: stats.spoolerStatus },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-title"
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="companion-title" className="font-display font-semibold tracking-tight text-base leading-none text-ink flex items-center gap-2">
              PC Companion <Badge tone="amber">Preview</Badge>
            </h2>
            <p className="text-xs text-slate-500">
              Pairing code <span className="font-mono">{pairingCode}</span>
            </p>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <Notice tone="warning">
            This is a preview. Repair actions are simulated and are <strong>not</strong> run on your PC. The script only shares
            read-only system status.
          </Notice>

          {/* Script download */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">PowerShell script</p>
              <p className="text-xs text-slate-500">Run it on the Windows PC you want to check.</p>
            </div>
            <a
              href={`/api/companion/download?code=${pairingCode}`}
              download
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ink hover:bg-ink-2 text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>

          {/* Status */}
          {statItems.length > 0 && (
            <dl className="grid grid-cols-2 rounded-lg border border-slate-200 divide-x divide-y divide-slate-200 overflow-hidden">
              {statItems.map((s) => (
                <div key={s.label} className="p-3">
                  <dt className="text-xs text-slate-500">{s.label}</dt>
                  <dd className={`text-sm font-medium truncate ${s.tone || 'text-slate-900'}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Actions */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Actions</h3>
            <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {availableActions.map((item) => (
                <li key={item.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">{item.title.toLowerCase()}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={executingActionId === item.id}
                    onClick={() => handleInitiateAction(item)}
                  >
                    {executingActionId === item.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Run
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Approval prompt */}
          {pendingAction && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-900">This action needs administrator rights</p>
              <pre className="text-xs font-mono text-slate-800 bg-white border border-amber-200 rounded-md p-2 whitespace-pre-wrap break-all">
                {pendingAction.command}
              </pre>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setPendingAction(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => executeAction(pendingAction.id, true)}>
                  Run (simulated)
                </Button>
              </div>
            </div>
          )}

          {/* Output */}
          {actionResult && (
            <pre
              className={`rounded-lg bg-slate-900 p-3 text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap ${
                actionResult.status === 'success' ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {actionResult.output}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

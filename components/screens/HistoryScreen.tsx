'use client';

import React from 'react';
import { ChevronRight, Trash2, Wifi, Printer, RefreshCw, Download, History as HistoryIcon } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { downloadReport } from '@/lib/report-export';
import { Badge, Button, Card, EmptyState, IconButton, Page, PageHeader } from '@/components/ui';

interface HistoryScreenProps {
  history: DiagnosisReport[];
  onSelectReport: (report: DiagnosisReport) => void;
  onClearHistory: () => void;
  onLaunchScan?: (preset?: 'wifi' | 'printer' | 'update') => void;
}

function statusOf(item: DiagnosisReport) {
  if (item.resolved === true) return { label: 'Resolved', tone: 'green' as const };
  if (item.resolved === false) return { label: 'Not fixed', tone: 'red' as const };
  return { label: 'Diagnosed', tone: 'blue' as const };
}

export default function HistoryScreen({ history, onSelectReport, onClearHistory, onLaunchScan }: HistoryScreenProps) {
  const handleClear = () => {
    if (history.length === 0) return;
    if (window.confirm('Delete all saved diagnoses from this device?')) onClearHistory();
  };

  return (
    <Page size="md">
      <PageHeader
        eyebrow="Archive"
        title="Your fixes"
        description="Every diagnosis is saved on this device only. Revisit a fix or download its report."
        actions={
          history.length > 0 ? (
            <Button variant="danger" size="sm" onClick={handleClear}>
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          ) : undefined
        }
      />

      {history.length > 0 ? (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {history.map((item, idx) => {
              const status = statusOf(item);
              const date = new Date(item.createdAt);
              return (
                <li key={item.id || idx} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectReport(item)}
                    className="flex-1 min-w-0 text-left px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-paper transition-colors group focus-visible:outline-none focus-visible:bg-paper"
                  >
                    <span className="eyebrow text-ink-soft/70 w-6 shrink-0 hidden sm:block">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold tracking-tight text-lg text-ink truncate group-hover:text-accent-600 transition-colors">{item.problemSummary}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <span>{date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {item.detectedErrorCodes?.[0] && <span className="font-mono hidden sm:inline">· {item.detectedErrorCodes[0]}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink/25 group-hover:text-accent-600 shrink-0" />
                  </button>
                  <div className="pr-3 sm:pr-4">
                    <IconButton label={`Download report for ${item.problemSummary}`} variant="ghost" size="sm" onClick={() => downloadReport(item)}>
                      <Download className="w-4 h-4" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<HistoryIcon className="w-6 h-6" />}
            title="No diagnoses yet"
            description="When you scan an error, it shows up here so you can revisit the fix or download a report."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { preset: 'wifi' as const, label: 'Wi-Fi example', Icon: Wifi },
                  { preset: 'printer' as const, label: 'Printer example', Icon: Printer },
                  { preset: 'update' as const, label: 'Update example', Icon: RefreshCw },
                ].map(({ preset, label, Icon }) => (
                  <Button key={preset} variant="secondary" size="sm" onClick={() => onLaunchScan?.(preset)}>
                    <Icon className="w-3.5 h-3.5 text-ink-soft" />
                    {label}
                  </Button>
                ))}
              </div>
            }
          />
        </Card>
      )}
    </Page>
  );
}

'use client';

import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { DiagnosisReport } from '@/types/technician';
import { downloadReport, printReport } from '@/lib/report-export';
import { Button } from '@/components/ui';

/** "Download report" + "Save as PDF" buttons for a diagnosis. */
export default function ReportActions({ report, compact = false }: { report: DiagnosisReport; compact?: boolean }) {
  const [note, setNote] = useState<string | null>(null);

  const handlePdf = () => {
    setNote(null);
    if (!printReport(report)) {
      setNote('Pop-up blocked. Use Download instead, then open the file and choose “Save as PDF”.');
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={() => downloadReport(report)}>
          <Download className="w-4 h-4 text-slate-500" />
          Download report
        </Button>
        <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={handlePdf}>
          <Printer className="w-4 h-4 text-slate-500" />
          Save as PDF
        </Button>
      </div>
      {note && <p className="text-xs text-amber-700">{note}</p>}
    </div>
  );
}

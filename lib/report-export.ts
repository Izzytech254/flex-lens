import { DiagnosisReport } from '@/types/technician';

// Builds a polished, self-contained repair report (HTML with print styles) that can be
// downloaded or saved as PDF via the browser's print dialog.

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusOf(report: DiagnosisReport) {
  if (report.resolved === true) return { label: 'Resolved', fg: '#1f4a36', bg: '#e1ece4', border: '#b9d3c2' };
  if (report.resolved === false) return { label: 'Not fixed yet', fg: '#b91c1c', bg: '#fef2f2', border: '#fecaca' };
  return { label: 'Diagnosed', fg: '#15171c', bg: '#efeae0', border: '#d6cfbf' };
}

const PROB_STYLE: Record<string, string> = {
  HIGH: 'color:#b91c1c;background:#fef2f2;border-color:#fecaca',
  MEDIUM: 'color:#b45309;background:#fffbeb;border-color:#fde68a',
  LOW: 'color:#475569;background:#f8fafc;border-color:#e2e8f0',
};

function commandLabel(actionType: string): string {
  if (actionType === 'cmd_command') return 'Command Prompt';
  if (actionType === 'terminal_cmd') return 'Terminal';
  return 'PowerShell';
}

function confidencePct(report: DiagnosisReport): number {
  const fallback: Record<string, number> = { HIGH: 0.85, MEDIUM: 0.6, LOW: 0.35 };
  return Math.round((report.confidenceScore ?? fallback[report.confidence] ?? 0.5) * 100);
}

export function reportFileName(report: DiagnosisReport): string {
  const date = new Date(report.createdAt || Date.now());
  const stamp = Number.isNaN(date.getTime()) ? 'report' : date.toISOString().slice(0, 10);
  const slug = (report.problemSummary || 'diagnosis')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `FixLens-Report-${stamp}-${slug || 'diagnosis'}.html`;
}

export function buildReportHtml(report: DiagnosisReport, siteUrl: string): string {
  const status = statusOf(report);
  const created = new Date(report.createdAt || Date.now());
  const createdText = Number.isNaN(created.getTime())
    ? ''
    : created.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
  const steps = report.troubleshootingSteps || [];
  const causes = report.possibleCauses || [];
  const symptoms = report.observedSymptoms || [];
  const codes = report.detectedErrorCodes || [];
  const citations = report.citations || [];
  const pct = confidencePct(report);
  const os = report.systemContext && report.systemContext !== 'Unknown OS' ? report.systemContext : 'Not detected';

  const metaRows = [
    ['Report ID', report.id],
    ['Date', createdText],
    ['Operating system', os],
    ['Affected component', report.affectedComponent || '—'],
    ['Error code', codes.length ? codes.join(', ') : 'None visible'],
    ['Confidence', `${pct}%`],
  ];

  const stepsHtml = steps
    .map(
      (st, i) => `
      <li class="step">
        <div class="step-num">${i + 1}</div>
        <div class="step-body">
          <div class="step-head">
            <h3>${esc(st.title)}</h3>
            ${st.isAdministratorRequired ? `<span class="tag tag-amber">${st.actionType === 'terminal_cmd' ? 'Needs sudo' : 'Admin required'}</span>` : ''}
            <span class="check" aria-hidden="true"></span>
          </div>
          ${st.description ? `<p>${esc(st.description)}</p>` : ''}
          ${
            st.command
              ? `<div class="cmd"><div class="cmd-label">${esc(commandLabel(st.actionType))}</div><code>${esc(st.command)}</code></div>`
              : ''
          }
          ${st.safetyCaution ? `<div class="note note-amber"><strong>Caution:</strong> ${esc(st.safetyCaution)}</div>` : ''}
          ${st.expectedOutcome ? `<div class="note note-green"><strong>You should see:</strong> ${esc(st.expectedOutcome)}</div>` : ''}
        </div>
      </li>`
    )
    .join('');

  const causesHtml = causes
    .map(
      (c) => `
      <tr>
        <td><strong>${esc(c.title)}</strong>${c.whyLikely ? `<div class="muted">${esc(c.whyLikely)}</div>` : ''}</td>
        <td class="right"><span class="pill" style="${PROB_STYLE[c.probability] || PROB_STYLE.LOW}">${esc(c.probability)}</span></td>
      </tr>`
    )
    .join('');

  const image =
    report.capturedImage && /^data:image\/(jpeg|png|webp);base64,/.test(report.capturedImage)
      ? `<section><h2>Screen captured</h2><img class="shot" src="${report.capturedImage}" alt="Screen captured during the scan" /></section>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FixLens Repair Report — ${esc(report.problemSummary)}</title>
<style>
  :root { --ink:#15171c; --muted:#545a65; --line:#e3ddd0; --brand:#e5582a; --soft:#f4f1eb; }
  * { box-sizing: border-box; }
  body { margin:0; background:#ebe6db; color:var(--ink); font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .toolbar { max-width: 820px; margin: 24px auto 0; display:flex; justify-content:flex-end; gap:8px; padding: 0 16px; }
  .toolbar button { font: inherit; font-weight:600; border:1px solid var(--line); background:#fff; color:var(--ink); padding:8px 14px; border-radius:10px; cursor:pointer; }
  .toolbar button.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  .page { max-width: 820px; margin: 12px auto 40px; background:#fff; border-radius:18px; box-shadow: 0 10px 30px rgba(15,23,42,.08); overflow:hidden; }
  .band { background:#15171c; border-bottom:4px solid #e5582a; color:#f4f1eb; padding: 28px 36px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .logo { width:40px; height:40px; border-radius:11px; background:rgba(229,88,42,.18); display:flex; align-items:center; justify-content:center; }
  .brand-name { font-size:20px; font-weight:800; letter-spacing:-.02em; }
  .brand-sub { font-size:12px; opacity:.85; }
  .doc-title { text-align:right; }
  .doc-title .k { font-size:11px; text-transform:uppercase; letter-spacing:.12em; opacity:.8; }
  .doc-title .v { font-size:18px; font-weight:700; }
  .content { padding: 32px 36px 28px; }
  .summary { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding-bottom:20px; border-bottom:1px solid var(--line); }
  .summary h1 { font-size:24px; line-height:1.2; margin:0 0 6px; letter-spacing:-.02em; }
  .status { flex-shrink:0; font-weight:700; font-size:12px; padding:6px 12px; border-radius:999px; border:1px solid; }
  .meta { display:grid; grid-template-columns: repeat(3, 1fr); gap:0; margin:20px 0 4px; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .meta div { padding:10px 14px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
  .meta div:nth-child(3n) { border-right:none; }
  .meta div:nth-last-child(-n+3) { border-bottom:none; }
  .meta .k { font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  .meta .v { font-weight:600; word-break:break-word; }
  section { margin-top: 26px; }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin:0 0 10px; }
  ul.plain { margin:0; padding-left:18px; }
  ul.plain li { margin:3px 0; }
  table { width:100%; border-collapse:collapse; }
  td { padding:10px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  .right { text-align:right; width:110px; }
  .muted { color:var(--muted); font-size:12.5px; }
  .pill, .tag { display:inline-block; font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:999px; border:1px solid; }
  .tag-amber { color:#b45309; background:#fffbeb; border-color:#fde68a; }
  .bar { height:8px; background:#f1f5f9; border-radius:99px; overflow:hidden; margin-top:6px; }
  .bar span { display:block; height:100%; background:var(--brand); border-radius:99px; }
  ol.steps { list-style:none; margin:0; padding:0; }
  .step { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--line); break-inside: avoid; page-break-inside: avoid; }
  .step:last-child { border-bottom:none; }
  .step-num { width:28px; height:28px; border-radius:50%; background:var(--brand); color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .step-body { flex:1; min-width:0; }
  .step-head { display:flex; align-items:center; gap:8px; }
  .step-head h3 { margin:0; font-size:15px; flex:1; }
  .check { width:16px; height:16px; border:1.5px solid #cbd5e1; border-radius:4px; flex-shrink:0; }
  .step p { margin:6px 0 0; }
  .cmd { margin-top:8px; background:#15171c; color:#f4a988; border-radius:10px; padding:10px 12px; }
  .cmd-label { color:#94a3b8; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
  .cmd code { font: 12.5px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space:pre-wrap; word-break:break-all; }
  .note { margin-top:8px; padding:8px 12px; border-radius:10px; font-size:13px; border:1px solid; }
  .note-amber { background:#fffbeb; border-color:#fde68a; color:#92400e; }
  .note-green { background:#e1ece4; border-color:#b9d3c2; color:#1f4a36; }
  .shot { width:100%; border-radius:12px; border:1px solid var(--line); }
  a { color:var(--brand); }
  .footer { padding: 18px 36px; background:var(--soft); border-top:1px solid var(--line); font-size:12px; color:var(--muted); display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  @media (max-width: 640px) {
    .band, .content, .footer { padding-left:20px; padding-right:20px; }
    .band { flex-direction:column; align-items:flex-start; }
    .doc-title { text-align:left; }
    .meta { grid-template-columns: 1fr 1fr; }
    .meta div:nth-child(3n) { border-right:1px solid var(--line); }
    .meta div:nth-child(2n) { border-right:none; }
  }
  @page { size: A4; margin: 14mm; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .page { box-shadow:none; margin:0; max-width:none; border-radius:0; }
    .shot { max-height: 110mm; object-fit: contain; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()" class="primary">Save as PDF / Print</button>
  </div>
  <main class="page">
    <header class="band">
      <div class="brand">
        <div class="logo">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M14 22v-6a2 2 0 0 1 2-2h6M42 14h6a2 2 0 0 1 2 2v6M50 42v6a2 2 0 0 1-2 2h-6M22 50h-6a2 2 0 0 1-2-2v-6"/><circle cx="32" cy="32" r="9"/></svg>
        </div>
        <div>
          <div class="brand-name">FixLens</div>
          <div class="brand-sub">AI Computer Technician</div>
        </div>
      </div>
      <div class="doc-title">
        <div class="k">Repair report</div>
        <div class="v">#${esc(report.id.replace(/^fl_/, '').toUpperCase())}</div>
      </div>
    </header>

    <div class="content">
      <div class="summary">
        <div>
          <h1>${esc(report.problemSummary)}</h1>
          <div class="muted">${esc(createdText)}</div>
        </div>
        <span class="status" style="color:${status.fg};background:${status.bg};border-color:${status.border}">${status.label}</span>
      </div>

      <div class="meta">
        ${metaRows.map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}
      </div>
      <div class="bar" aria-label="Confidence ${pct}%"><span style="width:${pct}%"></span></div>

      ${symptoms.length ? `<section><h2>What FixLens saw</h2><ul class="plain">${symptoms.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''}

      ${causes.length ? `<section><h2>Likely causes</h2><table>${causesHtml}</table></section>` : ''}

      ${steps.length ? `<section><h2>Fix steps</h2><ol class="steps">${stepsHtml}</ol></section>` : ''}

      ${
        citations.length
          ? `<section><h2>Sources</h2><ul class="plain">${citations
              .filter((c) => /^https:\/\//.test(c.url))
              .map((c) => `<li><a href="${esc(c.url)}">${esc(c.sourceTitle)}</a>${c.summary ? ` — <span class="muted">${esc(c.summary)}</span>` : ''}</li>`)
              .join('')}</ul></section>`
          : ''
      }

      ${image}
    </div>

    <footer class="footer">
      <span>Generated by FixLens · ${esc(siteUrl)}</span>
      <span>Review every command before running it. AI guidance can be wrong — back up important data before system changes.</span>
    </footer>
  </main>
</body>
</html>`;
}

/** Downloads the report as a standalone HTML file. */
export function downloadReport(report: DiagnosisReport): void {
  const html = buildReportHtml(report, window.location.origin);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = reportFileName(report);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the report in a new tab and shows the print dialog (choose "Save as PDF"). */
export function printReport(report: DiagnosisReport): boolean {
  const html = buildReportHtml(report, window.location.origin);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Give the new tab a moment to lay out (and load the screenshot) before printing.
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // The user can still use the "Save as PDF / Print" button in the report.
    }
  }, 500);
  return true;
}

'use client';

// Offline diagnosis — free, no API key, no AI service.
// 1) Reads the text on the screen image in the browser with Tesseract.js (open-source OCR).
// 2) Matches it against FixLens's built-in error library (lib/error-kb.ts).
// Returns the same shape the AI returns, so the scanner can guide the user with voice as usual.

import { ERROR_KB, genericSteps, KbEntry, KbOS, KbStep } from '@/lib/error-kb';

let workerPromise: Promise<any> | null = null;

/** One shared OCR worker (the English language data is downloaded once, then cached by the browser). */
async function getWorker(): Promise<any> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('eng');
    })().catch((err) => {
      workerPromise = null; // allow retry
      throw err;
    });
  }
  return workerPromise;
}

/** Grayscale + contrast boost + sensible size: noticeably better OCR on photos of screens. */
function prepareImage(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1800;
      const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((img.naturalWidth || maxW) * scale);
      canvas.height = Math.round((img.naturalHeight || maxW * 0.6) * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('Canvas not available'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const boosted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
        px[i] = px[i + 1] = px[i + 2] = boosted;
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Could not load the image for reading.'));
    img.src = dataUrl;
  });
}

/** Fix common OCR mistakes in error codes (e.g. "0x8OO704cf" → "0x800704cf"). */
function normalise(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/0[xX][0-9a-fA-FoOlI]{8}/g, (m) => '0x' + m.slice(2).replace(/[oO]/g, '0').replace(/[lI]/g, '1'))
    .trim();
}

function guessOs(text: string): KbOS | 'unknown' {
  if (/ubuntu|debian|fedora|linux|sudo |apt |dpkg|kernel panic|segmentation fault|systemd|grub/i.test(text)) return 'Linux';
  if (/finder|macos|mac os|apple|system settings|quit unexpectedly|\bdmg\b/i.test(text)) return 'macOS';
  if (/windows|0x[0-9a-f]{8}|settings|command prompt|powershell|device manager|stop code/i.test(text)) return 'Windows';
  return 'unknown';
}

const ERRORISH = /\b(error|failed|failure|fatal|cannot|can'?t|unable|denied|not found|not responding|stopped|crash(ed)?|panic|exception|problem)\b|0x[0-9a-f]{8}/i;

function toStep(s: KbStep, idx: number) {
  return {
    stepNumber: idx + 1,
    title: s.title,
    description: s.description,
    spokenInstruction: s.spoken,
    command: s.command ?? null,
    actionType: s.actionType ?? (s.command ? 'powershell_cmd' : 'gui_action'),
    isAdministratorRequired: !!s.admin,
    expectedOutcome: s.expected ?? '',
    safetyCaution: s.caution ?? null,
  };
}

function fromEntry(entry: KbEntry, text: string) {
  const codeInText = text.match(/0x[0-9a-f]{8}/i)?.[0];
  const mainSteps = entry.steps.map(toStep);
  const backupSteps = genericSteps(entry.os).map(toStep);
  return {
    solutions: [
      {
        title: `Fix: ${entry.title}`,
        summary: `This is the usual fix for this exact error.`,
        steps: mainSteps,
      },
      {
        title: 'General troubleshooting',
        summary: "If the usual fix didn't do it, these safe general steps often clear it up.",
        steps: backupSteps,
      },
    ],
    screenState: 'ERROR_ACTIVE',
    source: 'offline',
    detectedOS: entry.os,
    detectedError: entry.title,
    errorCode: entry.code || codeInText || 'N/A',
    affectedComponent: entry.component,
    observedSymptoms: [`Text on screen: “${text.slice(0, 140)}${text.length > 140 ? '…' : ''}”`],
    possibleCauses: entry.causes.map((c) => ({ title: c.title, probability: c.probability, whyLikely: c.why })),
    realtimeSpokenGuidance: entry.explanation,
    troubleshootingSteps: mainSteps,
    citations: [],
    confidence: 0.8,
  };
}

/**
 * Matches text (read from the screen, or typed/pasted by the user) against the error library.
 * Returns an analysis with screenState ERROR_ACTIVE, NO_ERROR_DETECTED or UNCLEAR.
 */
function analyseText(raw: string, typed: boolean, osHint?: KbOS): any {
  const text = normalise(raw);

  if (text.replace(/[^a-z0-9]/gi, '').length < (typed ? 4 : 12)) {
    return {
      screenState: 'UNCLEAR',
      source: 'offline',
      realtimeSpokenGuidance: typed
        ? "Could you tell me a bit more? ... What does the error message say, or what happens when it goes wrong?"
        : "I can't quite read the screen. ... Move a bit closer so the error message fills the frame, and hold steady. ... Then tap scan.",
    };
  }

  // Known error? Pick the entry with the most matching patterns (entries for the user's OS win ties).
  let best: { entry: KbEntry; score: number } | null = null;
  for (const entry of ERROR_KB) {
    let score = entry.patterns.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
    if (score > 0 && osHint && entry.os === osHint) score += 0.5;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  if (best) return fromEntry(best.entry, text);

  // Typed descriptions use everyday words ("wifi not working", "printer won't print") — match by keywords too.
  if (typed) {
    const keywordMap: Array<[RegExp, string]> = [
      [/wi-?fi|wireless|internet (is )?(down|not working)|no internet|can'?t connect/i, 'win-wifi-0x800704cf'],
      [/printer|print(ing)? (won'?t|not|doesn'?t)/i, 'win-spooler-0x000006ba'],
      [/windows update|update (fail|won'?t|stuck)/i, 'win-update-0x80070002'],
      [/blue screen|bsod|crash(es|ed)? and restart/i, 'win-bsod'],
      [/(website|page)s? (won'?t|don'?t|not) load|dns/i, 'dns-failure'],
      [/(disk|storage|drive) (is )?(full|low)|no space|out of space/i, 'win-low-disk'],
      [/app (won'?t|doesn'?t) (open|start)|keeps crashing/i, 'win-app-0xc0000005'],
      [/driver|device (not|isn'?t) working|usb (not|isn'?t)/i, 'win-code43'],
      [/install(er|ation)? (fail|won'?t|error)/i, 'win-msi-1603'],
    ];
    const os = osHint || guessOs(text);
    for (const [re, id] of keywordMap) {
      if (re.test(text)) {
        const entry = ERROR_KB.find((e) => e.id === id);
        if (entry && (os === 'unknown' || os === entry.os)) return fromEntry(entry, text);
      }
    }
  }

  // Unknown, but clearly an error (or the user typed a problem): read it back and give safe general steps.
  if (typed || ERRORISH.test(text)) {
    const os = osHint || guessOs(text);
    const line = typed ? text : bestErrorLine(raw);
    const code = text.match(/0x[0-9a-f]{8}/i)?.[0];
    const steps = genericSteps(os).map(toStep);
    return {
      screenState: 'ERROR_ACTIVE',
      source: 'offline',
      detectedOS: os,
      detectedError: line.length > 80 ? line.slice(0, 77) + '…' : line,
      errorCode: code || 'N/A',
      affectedComponent: 'Unknown',
      observedSymptoms: [`${typed ? 'You said' : 'Text on screen'}: “${text.slice(0, 140)}${text.length > 140 ? '…' : ''}”`],
      possibleCauses: [
        { title: 'A temporary glitch', probability: 'MEDIUM', whyLikely: 'Many problems go away after trying again or restarting.' },
        { title: 'Missing updates', probability: 'MEDIUM', whyLikely: 'Updates fix many known problems.' },
      ],
      realtimeSpokenGuidance: typed
        ? "Ok, I don't have a specific fix saved for that one. ... So let's start with the safe basics that fix most problems."
        : `I can read an error that says: ${line}. ... I don't have a specific fix for this one saved, so let's start with the safe basics.`,
      solutions: [{ title: 'Safe general troubleshooting', summary: 'These basic steps fix a lot of common problems.', steps }],
      troubleshootingSteps: steps,
      citations: [],
      confidence: 0.4,
    };
  }

  return {
    screenState: 'NO_ERROR_DETECTED',
    source: 'offline',
    observedSymptomSummary: 'I can read the screen, but I don’t see an error message on it.',
  };
}

/** Offline diagnosis from a typed description or pasted error message (no AI, no key). */
export async function diagnoseOfflineText(description: string, osHint?: KbOS): Promise<any> {
  const result = analyseText(description, true, osHint);
  return { ...result, mode: 'text_description' };
}

/** The most "error-like" line of the OCR text, used as a title for unknown errors. */
function bestErrorLine(raw: string): string {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 6 && l.length <= 140);
  return lines.find((l) => ERRORISH.test(l)) || lines[0] || 'An error message';
}

/**
 * Reads the screen image and returns an AI-shaped analysis.
 * screenState is ERROR_ACTIVE (known or generic error), NO_ERROR_DETECTED, or UNCLEAR (couldn't read).
 */
export async function diagnoseOffline(imageDataUrl: string, osHint?: KbOS): Promise<any> {
  const worker = await getWorker();
  const canvas = await prepareImage(imageDataUrl);
  const { data } = await worker.recognize(canvas);
  return analyseText(data?.text || '', false, osHint);
}

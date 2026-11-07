import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import { rateLimit } from '@/lib/rate-limit';
import { personaForJson } from '@/lib/prompts';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5 MB decoded

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'realtime-solve', 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many scans. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { frameBase64, sessionContext, currentStepNumber, userSpokenInput } = body ?? {};

    if (typeof frameBase64 !== 'string' || !frameBase64) {
      return NextResponse.json({ error: 'An image of the screen is required.' }, { status: 400 });
    }
    if (frameBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image is too large. Please use an image under 7 MB.' }, { status: 413 });
    }

    let cleanBase64 = frameBase64;
    let mimeType = 'image/jpeg';
    const dataUrlMatch = frameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (dataUrlMatch) {
      const detected = dataUrlMatch[1].toLowerCase();
      mimeType = detected === 'image/jpg' ? 'image/jpeg' : detected;
      cleanBase64 = dataUrlMatch[2];
    }
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image type. Use JPEG, PNG, WebP or GIF.' }, { status: 415 });
    }

    // Only pass short, known fields from the client into the prompt.
    const safeContext = {
      detectedError: clip(sessionContext?.detectedError, 200),
      affectedComponent: clip(sessionContext?.affectedComponent, 200),
    };
    const stepNumber = Number.isFinite(Number(currentStepNumber)) ? Number(currentStepNumber) : 1;
    const spoken = clip(userSpokenInput, 500);

    const promptText = `
Look at this screen capture or camera frame of a computer screen.

SESSION CONTEXT (from the app, may be empty):
${JSON.stringify(safeContext)}
Step Number: ${stepNumber}
${spoken ? `User said: ${JSON.stringify(spoken)}` : ''}

WHAT TO DO:
1. Identify the operating system from what is visible (Windows, macOS, Linux, or "unknown" if you can't tell). Do not guess.
2. Read the exact visible error message, dialog, code (e.g. 0x800704cf, kernel panic text, a terminal error), or system status. Quote only what is genuinely visible.
   - Error clearly visible → screenState "ERROR_ACTIVE".
   - No error visible → screenState "NO_ERROR_DETECTED" and describe what is on screen.
   - Too blurry, cropped, glare, or not enough to be sure → screenState "UNCLEAR", and use realtimeSpokenGuidance to ask the user to show the specific window, move closer, or paste the exact error text. Leave causes and steps empty.
3. Name the affected component or app (e.g. WLAN AutoConfig 'wlansvc', CUPS, NetworkManager, Wi-Fi in macOS System Settings). Mark it as an inference if it isn't written on screen.
4. realtimeSpokenGuidance: 1-2 short spoken sentences, natural and calm, no markdown. Say what you see, then the ONE next thing to try, and ask them to tell you what happens.
5. observedSymptoms: 2-4 things actually visible on screen.
6. possibleCauses: 2-3 causes based strictly on the evidence, each with a likelihood. Label inferences as inferences.
7. troubleshootingSteps: 2-4 sequential steps for the detected OS (shown one at a time in the app). Only include a command when genuinely needed and you are certain it exists for that OS. Prefer safe, non-destructive actions. Mark administrator/sudo rights and add a safetyCaution for anything risky (recommend a backup before destructive actions). If the problem looks like hardware failure or malware with data at risk, say so and recommend a professional as the step.
8. boundingBoxHint: percentages of the image framing the error.
9. citations: only official vendor documentation URLs you are confident exist; otherwise an empty list.

RETURN STRICT JSON:
{
  "screenState": "ERROR_ACTIVE" | "NO_ERROR_DETECTED" | "UNCLEAR" | "RESOLVED" | "FIX_IN_PROGRESS",
  "detectedOS": "Windows 11" | "Windows" | "macOS" | "Linux (Ubuntu)" | "Linux" | "unknown",
  "detectedError": "Short name of the problem, e.g. 'Wi-Fi cannot connect (0x800704cf)'",
  "errorCode": "e.g. 0x800704cf or N/A",
  "affectedComponent": "e.g. WLAN AutoConfig (wlansvc)",
  "observedSymptomSummary": "One sentence describing what is visible",
  "observedSymptoms": ["Symptom visible on screen", "..."],
  "possibleCauses": [
    { "title": "Cause", "probability": "HIGH" | "MEDIUM" | "LOW", "whyLikely": "Short reason based on the screen" }
  ],
  "realtimeSpokenGuidance": "Spoken sentence for text-to-speech.",
  "currentActionInstruction": "Immediate next action.",
  "companionActionId": "restart-wlan" | "restart-spooler" | "reset-update-services" | "flush-dns" | "reset-winsock" | "clean-temp" | null,
  "confidence": number between 0.0 and 1.0,
  "boundingBoxHint": { "label": "Error Box", "topPercent": 25, "leftPercent": 20, "widthPercent": 60, "heightPercent": 40 },
  "troubleshootingSteps": [
    {
      "stepNumber": 1,
      "title": "Short title",
      "description": "Clear action instruction",
      "command": "Exact command for the detected OS (PowerShell, CMD, Terminal/shell) or null",
      "actionType": "gui_action" | "powershell_cmd" | "cmd_command" | "terminal_cmd" | "hardware_check" | "reboot_check",
      "isAdministratorRequired": boolean (admin / sudo needed),
      "expectedOutcome": "What the user should see after this step",
      "safetyCaution": "Warning if the step can lose data, otherwise null"
    }
  ],
  "citations": [
    { "sourceTitle": "Title", "url": "https://learn.microsoft.com/...", "summary": "Why it is relevant" }
  ]
}
`;

    const response = await generateContentWithFallback({
      contents: [{ inlineData: { mimeType, data: cleanBase64 } }, { text: promptText }],
      systemInstruction: personaForJson(),
      responseMimeType: 'application/json',
    });

    const rawText = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({ success: true, analysis: parsed });
  } catch (error: any) {
    console.error('Real-time video solve error:', error);
    return NextResponse.json(
      { error: 'Screen analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

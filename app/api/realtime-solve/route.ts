import { NextRequest, NextResponse } from 'next/server';
import { aiErrorResponseInit, generateContentWithFallback } from '@/lib/gemini';
import { rateLimit } from '@/lib/rate-limit';
import { personaForJson } from '@/lib/prompts';
import { parseModelJson, readJsonBody } from '@/lib/api-utils';

// AI calls can take several seconds; allow up to 60s on serverless hosts (e.g. Vercel).
export const maxDuration = 60;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5 MB decoded

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  // Live guidance checks the screen every few seconds, so allow ~1 request / 2 s per user.
  const limited = rateLimit(req, 'realtime-solve', 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many scans. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await readJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: 'Empty or invalid request.' }, { status: 400 });
    }
    const { frameBase64, sessionContext, currentStepNumber, userSpokenInput } = body;

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
    const quick = body?.mode === 'quick';
    const image = { inlineData: { mimeType, data: cleanBase64 } };

    // ---- Guide mode: the user is working through a fix; only check progress on the current step. ----
    const rawGuide = body?.guide;
    if (rawGuide && typeof rawGuide === 'object') {
      const guide = {
        problem: clip(rawGuide.problem, 200),
        os: clip(rawGuide.os, 60),
        stepNumber: Number(rawGuide.stepNumber) || 1,
        totalSteps: Number(rawGuide.totalSteps) || 1,
        stepTitle: clip(rawGuide.stepTitle, 200),
        stepInstruction: clip(rawGuide.stepInstruction, 500),
        expectedOutcome: clip(rawGuide.expectedOutcome, 300),
        lastTip: clip(rawGuide.lastTip, 300),
      };

      const progressPrompt = `
You are watching the user's screen live while they fix a problem with your guidance.

FIX IN PROGRESS (from the app, JSON):
${JSON.stringify(guide)}

Look at the current screen and decide. Be strict and conservative:
- If the original error dialog/message is still showing and nothing related to this step is visible, the step is NOT done.
- Only use STEP_DONE when you can clearly SEE this step's expected outcome on screen right now.
- Only use RESOLVED when the original error is clearly gone AND you can see things working normally.
- When unsure, use IN_PROGRESS or NOT_STARTED. A wrong STEP_DONE skips instructions the user still needs.
- stepProgress:
  "NOT_STARTED" — nothing on screen shows they've begun this step,
  "IN_PROGRESS" — they're partway (e.g. the right window is open but the action isn't finished),
  "STEP_DONE" — the screen clearly shows this step's expected outcome,
  "RESOLVED" — the original problem is clearly gone (error dialog closed and the thing works),
  "NEW_ERROR" — a different error appeared,
  "UNCLEAR" — you can't see enough to tell.
- liveGuidance: ONE short spoken beat (max ~20 words, one action) about exactly what to do right now based on what you can see, using a natural connector, e.g. "Ok, I can see Settings is open. ... Go ahead and click Network and internet on the left." If nothing has changed and the last tip still applies, return an empty string. Never repeat lastTip word for word. Only describe what is genuinely visible.
- newErrorText: if stepProgress is NEW_ERROR, the exact visible error text, else "".
- confidence: 0.0-1.0 for your stepProgress judgement.

RETURN STRICT JSON:
{ "stepProgress": "...", "liveGuidance": "...", "newErrorText": "", "confidence": 0.0,
  "boundingBoxHint": { "label": "Where to look", "topPercent": 0, "leftPercent": 0, "widthPercent": 0, "heightPercent": 0 } | null }
`;
      const response = await generateContentWithFallback({
        contents: [image, { text: progressPrompt }],
        systemInstruction: personaForJson(),
        responseMimeType: 'application/json',
        preferFast: true,
        noThinking: true,
      });
      return NextResponse.json({ success: true, progress: parseModelJson(response.text) });
    }

    // ---- Detect mode: fast first look. Just identify the error so FixLens can start talking
    // immediately; the full step-by-step plan is requested separately (mode "full"). ----
    if (body?.mode === 'detect') {
      const detectPrompt = `
Look at this camera frame or screenshot of a computer screen. Answer quickly and only from what is visible.

RETURN STRICT JSON:
{
  "screenState": "ERROR_ACTIVE" | "NO_ERROR_DETECTED" | "UNCLEAR",
  "detectedOS": "Windows 11" | "Windows" | "macOS" | "Linux (Ubuntu)" | "Linux" | "unknown",
  "detectedError": "Short name of the problem, e.g. 'Wi-Fi can't connect (0x800704cf)'",
  "errorCode": "exact code if visible, else N/A",
  "affectedComponent": "component or app, or Unknown",
  "observedSymptomSummary": "one short sentence describing what is on screen",
  "realtimeSpokenGuidance": "1-2 short spoken beats, natural and calm: say what you see and, in friend terms, what it means (simple cause → effect). If UNCLEAR, ask them to move closer or show the error. No steps.",
  "confidence": 0.0,
  "boundingBoxHint": { "label": "Error", "topPercent": 0, "leftPercent": 0, "widthPercent": 0, "heightPercent": 0 }
}
`;
      const response = await generateContentWithFallback({
        contents: [image, { text: detectPrompt }],
        systemInstruction: personaForJson(),
        responseMimeType: 'application/json',
        preferFast: true,
        noThinking: true,
      });
      return NextResponse.json({ success: true, detection: true, analysis: parseModelJson(response.text) });
    }

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
4. realtimeSpokenGuidance: 1-2 short spoken beats following the voice delivery rules. Say what you see and, in friend terms, what it means (simple cause → effect). Do NOT give the fix steps here — the app reads each step's spokenInstruction next.
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
      "description": "Clear written action instruction (shown on screen)",
      "spokenInstruction": "The same step as it would be said out loud: short beats, one action per sentence, separated by ' ... ', plain words, jargon explained in the same breath, ending by asking them to tell you what happens. No markdown, no reading out the command character by character.",
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
      contents: [image, { text: promptText }],
      systemInstruction: personaForJson(),
      responseMimeType: 'application/json',
      preferFast: quick,
      noThinking: true,
    });

    const parsed = parseModelJson(response.text);

    return NextResponse.json({ success: true, analysis: parsed });
  } catch (error: any) {
    console.error('Real-time video solve error:', error);
    const known = aiErrorResponseInit(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return NextResponse.json(
      { error: 'Screen analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

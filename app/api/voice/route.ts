import { NextRequest, NextResponse } from 'next/server';
import { aiErrorResponseInit, generateContentWithFallback } from '@/lib/gemini';
import { rateLimit } from '@/lib/rate-limit';
import { TECHNICIAN_PERSONA } from '@/lib/prompts';

export const maxDuration = 60;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'voice', 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many questions. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { question, report, activeStepIndex } = body ?? {};

    const q = clip(question, 1000).trim();
    if (!q) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    const idx = Number.isInteger(activeStepIndex) ? activeStepIndex : 0;
    const steps = Array.isArray(report?.troubleshootingSteps) ? report.troubleshootingSteps : [];
    const currentStep = steps[idx];
    const codes = Array.isArray(report?.detectedErrorCodes)
      ? report.detectedErrorCodes.map((c: unknown) => clip(c, 60)).join(', ')
      : '';

    const context = {
      problem: clip(report?.problemSummary, 200) || 'Not yet diagnosed',
      operatingSystem: clip(report?.systemContext, 120) || 'Unknown — ask if it matters',
      component: clip(report?.affectedComponent, 200) || 'Unknown',
      detectedErrors: codes || 'None detected',
      currentStepNumber: currentStep ? Number(currentStep.stepNumber) || idx + 1 : null,
      currentStepTitle: clip(currentStep?.title, 200),
      currentStepInstruction: clip(currentStep?.description, 500),
      currentStepCommand: clip(currentStep?.command, 500),
    };

    // Recent conversation so the assistant can work one step at a time.
    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = (
      Array.isArray(body?.history) ? body.history : []
    )
      .slice(-10)
      .map((m: any) => ({
        role: m?.sender === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: clip(m?.text, 1000) }],
      }))
      .filter((m: { parts: Array<{ text: string }> }) => m.parts[0].text);

    // Gemini expects the conversation to start with a user turn.
    while (history.length > 0 && history[0].role !== 'user') history.shift();

    const turn = `CURRENT SESSION CONTEXT (from the app, JSON):
${JSON.stringify(context)}

USER SAYS:
${q}

Reply out loud in 1 to 4 short spoken sentences. No markdown, no lists. Explain any command in words. Give one next step at a time, and ask them to tell you what happens.`;

    const response = await generateContentWithFallback({
      contents: [...history, { role: 'user', parts: [{ text: turn }] }],
      systemInstruction: TECHNICIAN_PERSONA,
    });

    const reply = response.text?.trim() || "Sorry, I didn't catch that. Could you say it again?";
    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error('Voice assistant error:', error);
    const known = aiErrorResponseInit(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return NextResponse.json({ error: 'Voice assistant encountered an error.' }, { status: 500 });
  }
}

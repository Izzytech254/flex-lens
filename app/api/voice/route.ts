import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, report, activeStepIndex, sessionHistory } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    const currentStep = report?.troubleshootingSteps?.[activeStepIndex];

    const promptText = `
You are FixLens, speaking directly to a user troubleshooting their Windows PC in real time.
Speak naturally, calmly, and authoritatively like a master IT systems technician.
Your response will be spoken aloud to the user via Text-to-Speech, so keep sentences punchy, conversational, and direct (2 to 4 sentences). Avoid code blocks or markdown tables; explain commands verbally.

CURRENT SESSION CONTEXT:
- Problem: ${report ? report.problemSummary : 'Analyzing computer issue'}
- Component: ${report ? report.affectedComponent : 'Windows system'}
- Detected Errors: ${report ? report.detectedErrorCodes.join(', ') : 'None explicitly detected'}
- Current Step (#${currentStep ? currentStep.stepNumber : 'N/A'}): ${currentStep ? currentStep.title : 'Overview'}
- Current Step Instruction: ${currentStep ? currentStep.description : 'N/A'}
- Current Step Command: ${currentStep ? currentStep.command || 'None' : 'None'}

USER'S SPOKEN QUESTION / STATEMENT:
"${question}"

Provide a direct, helpful spoken response answering their question within context.
`;

    const response = await generateContentWithFallback({
      contents: promptText,
      systemInstruction:
        'You are FixLens Voice, a real-time IT technician providing crisp, spoken audio advice for computer repairs.',
    });

    const reply = response.text?.trim() || 'I understand. Let me guide you through the next action.';

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error('Voice assistant error:', error);
    return NextResponse.json(
      { error: error.message || 'Voice assistant encountered an error.' },
      { status: 500 }
    );
  }
}

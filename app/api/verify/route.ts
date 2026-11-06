import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import { VerificationResult } from '@/types/technician';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initialImageBase64, verificationImageBase64, originalProblem, stepCompleted } = body;

    if (!verificationImageBase64) {
      return NextResponse.json(
        { error: 'A current camera capture or screenshot of the screen is required for visual verification.' },
        { status: 400 }
      );
    }

    const contents: any[] = [];

    // Add initial image if present
    if (initialImageBase64) {
      const cleanInitial = initialImageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanInitial,
        },
      });
    }

    // Add current verification image
    const cleanVerification = verificationImageBase64.replace(/^data:image\/\w+;base64,/, '');
    contents.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanVerification,
      },
    });

    const promptText = `
You are FixLens, performing post-repair visual verification.
Compare the current screen state against the original problem to determine if the computer issue has actually been resolved.

ORIGINAL PROBLEM:
"${originalProblem || 'Unspecified computer error'}"

STEP PERFORMED:
"${stepCompleted || 'Troubleshooting step applied'}"

VERIFICATION PROTOCOL:
1. Conduct honest, empirical visual inspection of the current screen.
2. DO NOT assume success if symptoms remain visible.
3. Check specifically:
   - Has the error dialog or BSOD disappeared?
   - Did the command output show "Successfully..." or an error?
   - Is the target program/service running normally?
   - Has the network icon switched from "No Internet / Disconnected" to "Connected"?
   - Has a secondary or new error popped up?
4. Determine the exact status: 'RESOLVED', 'PARTIALLY_RESOLVED', 'UNRESOLVED', or 'NEW_ERROR_APPEARED'.

RETURN VALID JSON:
{
  "isResolved": boolean,
  "status": "RESOLVED" | "PARTIALLY_RESOLVED" | "UNRESOLVED" | "NEW_ERROR_APPEARED",
  "observedState": "Detailed description of what is visibly present on screen now",
  "detectedDifferences": ["Error modal is closed", "Command prompt shows 0 errors"],
  "explanation": "Clear technician summary explaining why this is or is not resolved",
  "recommendedNextStep": "Immediate next recommendation for the user",
  "confidence": number (between 0.0 and 1.0)
}
`;

    contents.push({ text: promptText });

    const response = await generateContentWithFallback({
      contents: contents,
      systemInstruction:
        'You are an empirical visual technician. You verify computer repair results by inspecting screen captures. Never claim an issue is resolved when visual evidence shows otherwise.',
      responseMimeType: 'application/json',
    });

    const rawText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const verification: VerificationResult = {
      isResolved: !!parsed.isResolved,
      status: parsed.status || (parsed.isResolved ? 'RESOLVED' : 'UNRESOLVED'),
      observedState: parsed.observedState || 'Screen analyzed.',
      detectedDifferences: Array.isArray(parsed.detectedDifferences) ? parsed.detectedDifferences : [],
      explanation: parsed.explanation || 'Visual verification completed.',
      recommendedNextStep: parsed.recommendedNextStep || 'Proceed with next diagnostic step if needed.',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
    };

    return NextResponse.json({ success: true, verification });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to visually verify repair.' },
      { status: 500 }
    );
  }
}
